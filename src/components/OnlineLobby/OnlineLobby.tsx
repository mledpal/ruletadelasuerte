import { useState, type ReactNode } from 'react';
import { useOnline } from '../../online/OnlineContext';
import { MAX_ONLINE_PLAYERS, roomUrl } from '../../online/identity';
import styles from './OnlineLobby.module.css';

interface OnlineLobbyProps {
  /** Configuración de la partida (solo la ve el anfitrión) */
  hostSetup: ReactNode;
  onExit: () => void;
  onChangeName: () => void;
}

/** Sala de espera: enlace para invitar, jugadores conectados y configuración */
export function OnlineLobby({ hostSetup, onExit, onChangeName }: OnlineLobbyProps) {
  const online = useOnline();
  const [copied, setCopied] = useState(false);
  if (!online) return null;

  const { room, peers, clientId, isHost, status } = online;
  const link = roomUrl(room);
  const hostName = peers.find((p) => p.host)?.name;
  const canShare = typeof navigator.share === 'function';

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch { /* sin permiso de portapapeles: el enlace está visible */ }
  };

  const shareLink = () => {
    navigator.share({ title: 'La Ruleta de la Fortuna', text: `¡Juega conmigo a La Ruleta! Sala ${room}`, url: link }).catch(() => {});
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.label}>Sala</div>
        <div className={styles.code}>{room}</div>

        <div className={styles.invite}>
          <span className={styles.link}>{link}</span>
          <div className={styles.inviteButtons}>
            <button className={styles.smallButton} onClick={copyLink}>
              {copied ? '✓ ¡Copiado!' : '📋 Copiar enlace'}
            </button>
            {canShare && (
              <button className={styles.smallButton} onClick={shareLink}>
                📤 Compartir
              </button>
            )}
          </div>
        </div>

        <div className={styles.label}>Jugadores conectados</div>
        {status === 'connecting' && <div className={styles.note}>📡 Conectando con la sala…</div>}
        {status === 'error' && <div className={styles.error}>No se puede conectar con la sala. Reintentando…</div>}
        <ul className={styles.peers}>
          {peers.map((p, i) => (
            <li key={p.clientId} className={`${styles.peer} ${i >= MAX_ONLINE_PLAYERS ? styles.peerExtra : ''}`}>
              <span>{p.host ? '👑' : '🎮'}</span>
              <span className={styles.peerName}>{p.name}</span>
              {p.clientId === clientId && <span className={styles.me}>tú</span>}
            </li>
          ))}
        </ul>
        {peers.length > MAX_ONLINE_PLAYERS && (
          <div className={styles.note}>Solo juegan los {MAX_ONLINE_PLAYERS} primeros en llegar; el resto mira la partida.</div>
        )}

        {isHost ? (
          hostSetup
        ) : (
          <div className={styles.waiting}>
            ⏳ Esperando a que {hostName ?? 'el anfitrión'} configure y empiece la partida…
          </div>
        )}

        <div className={styles.footer}>
          <button className={styles.linkButton} onClick={onChangeName}>Cambiar mi nombre</button>
          <button className={styles.linkButton} onClick={onExit}>Salir de la sala</button>
        </div>
      </div>
    </div>
  );
}
