-- ═══════════════════════════════════════════════════════════════════
-- Ranking global de La Ruleta de la Fortuna (Supabase / PostgreSQL)
--
-- Ejecutar entero en Supabase → SQL Editor. Se puede volver a ejecutar
-- sin perder datos (todo es "if not exists" / "or replace").
--
-- Seguridad:
--   · Cualquiera puede LEER la tabla.
--   · Nadie puede escribir directamente: la única vía es la función
--     submit_score(), que valida los datos, solo guarda la puntuación si
--     entra en el top 10 de su modo y borra lo que quede fuera.
--
-- Orden del top: primero las partidas EN GRUPO (2 o más jugadores) y
-- después las demás (individuales y las antiguas sin nº de jugadores);
-- dentro de cada grupo, por puntuación. Así el Top 1 nunca es una
-- partida en solitario mientras haya alguna en grupo.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.ranking (
  id          bigint generated always as identity primary key,
  game_id     uuid        not null unique,          -- una entrada por partida como máximo
  name        text        not null check (char_length(name) between 1 and 20),
  score       integer     not null check (score > 0 and score <= 1000000),
  mode        text        not null check (mode in ('normal', 'castulo')),
  rounds      smallint    not null check (rounds between 1 and 5),
  created_at  timestamptz not null default now()
);

-- ── Datos de la partida (añadidos después: en las filas antiguas son null) ──
alter table public.ranking
  add column if not exists players   smallint check (players between 1 and 6),  -- nº de jugadores
  add column if not exists online    boolean,   -- true = online, false = local
  add column if not exists opponents text[],    -- nombres de los rivales del ganador
  add column if not exists wildcard  boolean,   -- se jugó con comodín
  add column if not exists bote      boolean,   -- había ronda de bote
  add column if not exists bote_won  boolean;   -- el ganador se llevó el bote

-- Partida en grupo (2+ jugadores). Las antiguas (players null) cuentan como no.
alter table public.ranking
  add column if not exists group_game boolean
  generated always as (coalesce(players, 0) >= 2) stored;

drop index if exists public.ranking_mode_score_idx;
create index if not exists ranking_mode_order_idx
  on public.ranking (mode, group_game desc, score desc, created_at, id);

-- ── Permisos: lectura pública, sin escritura directa ────────────────
alter table public.ranking enable row level security;

drop policy if exists "Lectura pública del ranking" on public.ranking;
create policy "Lectura pública del ranking"
  on public.ranking for select
  to anon, authenticated
  using (true);

grant select on public.ranking to anon, authenticated;
revoke insert, update, delete, truncate on public.ranking from anon, authenticated;

-- ── Única vía de escritura ──────────────────────────────────────────
-- La versión anterior (sin datos de la partida) se elimina para que no
-- entren puntuaciones sin registrar.
drop function if exists public.submit_score(uuid, text, integer, text, integer);

-- Devuelve true si la puntuación ha entrado en el top; false si no llega
-- o si esa partida ya se había enviado.
create or replace function public.submit_score(
  p_game_id   uuid,
  p_name      text,
  p_score     integer,
  p_mode      text,
  p_rounds    integer,
  p_players   integer,
  p_online    boolean,
  p_opponents text[],
  p_wildcard  boolean,
  p_bote      boolean,
  p_bote_won  boolean
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  c_size constant integer := 10;  -- tamaño del top (igual que RANKING_SIZE en el cliente)
  -- Los nombres se normalizan y se recortan a 20 caracteres (en online
  -- pueden llevar un sufijo « (2)» para distinguir nombres repetidos)
  v_name      text := left(btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g')), 20);
  v_opponents text[] := '{}';
  v_opp       text;
  v_group     boolean;
  v_count     integer;
  v_last      record;
begin
  if p_game_id is null then
    raise exception 'Partida no válida';
  end if;
  if char_length(v_name) = 0 then
    raise exception 'Nombre no válido';
  end if;
  if p_mode is null or p_mode not in ('normal', 'castulo') then
    raise exception 'Modo no válido';
  end if;
  if p_rounds is null or p_rounds not between 1 and 5 then
    raise exception 'Número de rondas no válido';
  end if;
  if p_players is null or p_players not between 1 and 6 then
    raise exception 'Número de jugadores no válido';
  end if;
  if p_online is null or p_wildcard is null or p_bote is null or p_bote_won is null then
    raise exception 'Datos de la partida incompletos';
  end if;
  if p_online and p_players < 2 then
    raise exception 'Una partida online tiene al menos 2 jugadores';
  end if;
  if p_bote and p_players < 2 then
    raise exception 'La ronda de bote requiere al menos 2 jugadores';
  end if;
  if p_bote_won and not p_bote then
    raise exception 'Bote no válido';
  end if;

  -- Rivales: exactamente players - 1 nombres no vacíos
  if coalesce(cardinality(p_opponents), 0) <> p_players - 1 then
    raise exception 'La lista de rivales no cuadra con el número de jugadores';
  end if;
  foreach v_opp in array coalesce(p_opponents, '{}') loop
    v_opp := left(btrim(regexp_replace(coalesce(v_opp, ''), '\s+', ' ', 'g')), 20);
    if char_length(v_opp) = 0 then
      raise exception 'Nombre de rival no válido';
    end if;
    v_opponents := v_opponents || v_opp;
  end loop;

  if p_score is null or p_score not between 1 and 1000000 then
    return false;
  end if;

  v_group := p_players >= 2;

  -- Serializa los envíos de un mismo modo para que el recorte al top sea exacto
  perform pg_advisory_xact_lock(hashtext('ruleta_ranking:' || p_mode));

  if exists (select 1 from ranking where game_id = p_game_id) then
    return false;
  end if;

  select count(*) into v_count from ranking where mode = p_mode;

  -- Con la tabla llena hay que superar al último en el orden del top
  -- (grupo primero, luego puntuación; un empate no lo desplaza)
  if v_count >= c_size then
    select group_game, score into v_last
    from ranking
    where mode = p_mode
    order by group_game desc, score desc, created_at asc, id asc
    offset c_size - 1 limit 1;

    if (v_group, p_score) <= (v_last.group_game, v_last.score) then
      return false;
    end if;
  end if;

  insert into ranking (game_id, name, score, mode, rounds,
                       players, online, opponents, wildcard, bote, bote_won)
  values (p_game_id, v_name, p_score, p_mode, p_rounds,
          p_players, p_online, v_opponents, p_wildcard, p_bote, p_bote_won);

  -- Elimina lo que haya quedado fuera del top
  delete from ranking
  where mode = p_mode
    and id not in (
      select id from ranking
      where mode = p_mode
      order by group_game desc, score desc, created_at asc, id asc
      limit c_size
    );

  return true;
end;
$$;

revoke all on function public.submit_score(uuid, text, integer, text, integer, integer, boolean, text[], boolean, boolean, boolean) from public;
grant execute on function public.submit_score(uuid, text, integer, text, integer, integer, boolean, text[], boolean, boolean, boolean) to anon, authenticated;

-- Que la API REST vea ya las columnas y la función nuevas
notify pgrst, 'reload schema';
