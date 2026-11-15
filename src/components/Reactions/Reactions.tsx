import { useState } from 'react';
import { useOnline } from '../../online/OnlineContext';
import styles from './Reactions.module.css';

const EMOJIS = ['👏', '😂', '😱', '🔥', '😭', '🤔', '🍀', '💸'];
const QUICK_PHRASES = ['¡Qué suerte!', '¡Resuélvelo ya!', '¡Por poco!', '¡Bien jugado!', '¡Vamos!', 'Ni idea…'];
const MAX_CHAT_LENGTH = 80;

/** Solo emojis (sin letras): se muestran en grande */
const isEmojiOnly = (text: string) => /^\p{Extended_Pictographic}+$/u.test(text.replace(/\s/g, ''));

/** Reacciones y chat rápido entre los jugadores de la sala (solo online) */
export function Reactions() {
  const online = useOnline();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  if (!online) return null;

  const send = (value: string) => {
    const clean = value.trim().slice(0, MAX_CHAT_LENGTH);
    if (!clean) return;
    online.sendReaction(clean);
  };

  const sendChat = () => {
    send(text);
    setText('');
  };

  return (
    <>
      <div className={styles.bubbles} aria-live="polite">
        {online.reactions.map((r) => (
          <div key={r.id} className={`${styles.bubble} ${isEmojiOnly(r.text) ? styles.bubbleEmoji : ''}`}>
            <span className={styles.bubbleName}>{r.name}</span>
            <span className={styles.bubbleText}>{r.text}</span>
          </div>
        ))}
      </div>

      {open && (
        <div className={styles.panel}>
          <div className={styles.emojis}>
            {EMOJIS.map((e) => (
              <button key={e} type="button" className={styles.emoji} onClick={() => send(e)}>
                {e}
              </button>
            ))}
          </div>
          <div className={styles.quick}>
            {QUICK_PHRASES.map((q) => (
              <button key={q} type="button" className={styles.quickButton} onClick={() => send(q)}>
                {q}
              </button>
            ))}
          </div>
          <form
            className={styles.chat}
            onSubmit={(e) => {
              e.preventDefault();
              sendChat();
            }}
          >
            <input
              className={styles.chatInput}
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_CHAT_LENGTH))}
              placeholder="Escribe un mensaje…"
              maxLength={MAX_CHAT_LENGTH}
              autoComplete="off"
            />
            <button type="submit" className={styles.chatSend} disabled={!text.trim()}>
              Enviar
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        className={`${styles.toggle} ${open ? styles.toggleOpen : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title="Reacciones y chat"
      >
        {open ? '✕' : '💬'}
      </button>
    </>
  );
}
