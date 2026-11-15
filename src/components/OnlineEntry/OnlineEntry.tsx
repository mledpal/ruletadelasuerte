import { useState } from 'react';
import { MAX_NAME_LENGTH } from '../../utils/ranking';
import {
  cleanOnlineName,
  loadOnlineName,
  newRoomCode,
  parseRoomCode,
  ROOM_CODE_LENGTH,
  saveOnlineName,
} from '../../online/identity';
import styles from './OnlineEntry.module.css';

interface OnlineEntryProps {
  /** Se llega con un enlace de sala: solo falta el nombre */
  room?: string;
  /** Entrar en la sala (host = la acaba de crear este navegador) */
  onEnter: (room: string, host: boolean) => void;
  onBack: () => void;
}

/** Crear una sala o unirse a una con su código (y elegir el nombre) */
export function OnlineEntry({ room, onEnter, onBack }: OnlineEntryProps) {
  const [name, setName] = useState(loadOnlineName);
  const [code, setCode] = useState('');
  const cleanName = cleanOnlineName(name);
  const parsedCode = parseRoomCode(code);

  const enter = (target: string, host: boolean) => {
    if (!cleanName) return;
    saveOnlineName(cleanName);
    onEnter(target, host);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.title}>{room ? `Sala ${room}` : 'Jugar online'}</div>
        <div className={styles.subtitle}>
          {room ? 'Te han invitado a una partida de La Ruleta' : 'Cada jugador desde su casa, con su propio dispositivo'}
        </div>

        <label className={styles.field}>
          <span className={styles.label}>Tu nombre</span>
          <input
            className={styles.input}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, MAX_NAME_LENGTH))}
            onKeyDown={(e) => e.key === 'Enter' && room && enter(room, false)}
            placeholder="¿Cómo te llamas?"
            maxLength={MAX_NAME_LENGTH}
            autoComplete="off"
            autoFocus
          />
        </label>

        {room ? (
          <button className={styles.primary} disabled={!cleanName} onClick={() => enter(room, false)}>
            Entrar en la sala
          </button>
        ) : (
          <>
            <button className={styles.primary} disabled={!cleanName} onClick={() => enter(newRoomCode(), true)}>
              Crear sala nueva
            </button>

            <div className={styles.divider}>o únete a la de un amigo</div>

            <div className={styles.joinRow}>
              <input
                className={`${styles.input} ${styles.codeInput}`}
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && parsedCode && enter(parsedCode, false)}
                placeholder="CÓDIGO"
                maxLength={ROOM_CODE_LENGTH + 2}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                aria-label="Código de la sala"
              />
              <button
                className={styles.secondary}
                disabled={!cleanName || !parsedCode}
                onClick={() => parsedCode && enter(parsedCode, false)}
              >
                Unirme
              </button>
            </div>
          </>
        )}

        <button className={styles.backLink} onClick={onBack}>
          ← Volver
        </button>
      </div>
    </div>
  );
}
