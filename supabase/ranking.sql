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

create index if not exists ranking_mode_score_idx
  on public.ranking (mode, score desc, created_at, id);

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
-- Devuelve true si la puntuación ha entrado en el top; false si no llega
-- o si esa partida ya se había enviado.
create or replace function public.submit_score(
  p_game_id uuid,
  p_name    text,
  p_score   integer,
  p_mode    text,
  p_rounds  integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  c_size constant integer := 10;  -- tamaño del top (igual que RANKING_SIZE en el cliente)
  v_name  text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  v_count integer;
  v_min   integer;
begin
  if p_game_id is null then
    raise exception 'Partida no válida';
  end if;
  if char_length(v_name) not between 1 and 20 then
    raise exception 'Nombre no válido';
  end if;
  if p_mode is null or p_mode not in ('normal', 'castulo') then
    raise exception 'Modo no válido';
  end if;
  if p_rounds is null or p_rounds not between 1 and 5 then
    raise exception 'Número de rondas no válido';
  end if;
  if p_score is null or p_score not between 1 and 1000000 then
    return false;
  end if;

  -- Serializa los envíos de un mismo modo para que el recorte al top sea exacto
  perform pg_advisory_xact_lock(hashtext('ruleta_ranking:' || p_mode));

  if exists (select 1 from ranking where game_id = p_game_id) then
    return false;
  end if;

  select count(*), min(score) into v_count, v_min
  from ranking
  where mode = p_mode;

  -- Con la tabla llena hay que superar al último (un empate no lo desplaza)
  if v_count >= c_size and p_score <= v_min then
    return false;
  end if;

  insert into ranking (game_id, name, score, mode, rounds)
  values (p_game_id, v_name, p_score, p_mode, p_rounds);

  -- Elimina lo que haya quedado fuera del top
  delete from ranking
  where mode = p_mode
    and id not in (
      select id from ranking
      where mode = p_mode
      order by score desc, created_at asc, id asc
      limit c_size
    );

  return true;
end;
$$;

revoke all on function public.submit_score(uuid, text, integer, text, integer) from public;
grant execute on function public.submit_score(uuid, text, integer, text, integer) to anon, authenticated;
