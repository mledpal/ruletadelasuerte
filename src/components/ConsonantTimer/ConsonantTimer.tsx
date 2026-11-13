import { useEffect, useRef, useState } from 'react';
import { playWheelTick } from '../../utils/audio';
import styles from './ConsonantTimer.module.css';

/** Segundos finales en los que la cuenta atrás avisa (color y sonido) */
const WARNING_SECONDS = 5;

interface ConsonantTimerProps {
  seconds: number;
  onExpire: () => void;
}

/**
 * Cuenta atrás para pulsar la consonante. Empieza al montarse: el padre la
 * monta solo mientras el jugador puede elegir consonante y la desmonta al
 * pausarla (diálogos, revelado...), con lo que cada montaje parte de cero.
 */
export function ConsonantTimer({ seconds, onExpire }: ConsonantTimerProps) {
  const [timeLeft, setTimeLeft] = useState(seconds);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    const deadline = Date.now() + seconds * 1000;
    let last = seconds;
    const id = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      if (left === last) return;
      last = left;
      setTimeLeft(left);
      if (left === 0) {
        window.clearInterval(id);
        onExpireRef.current();
      } else if (left <= WARNING_SECONDS) {
        playWheelTick(0.5);
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [seconds]);

  const warning = timeLeft <= WARNING_SECONDS;

  return (
    <div
      className={`${styles.timer} ${warning ? styles.warning : ''}`}
      role="timer"
      aria-label={`Quedan ${timeLeft} segundos para elegir consonante`}
    >
      <span className={styles.label}>⏱️ Elige consonante</span>
      <progress className={styles.bar} value={timeLeft} max={seconds} />
      <span className={styles.seconds}>{timeLeft}s</span>
    </div>
  );
}
