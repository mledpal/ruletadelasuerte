import styles from './Dialog.module.css';

interface DialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function Dialog({ message, onConfirm, onCancel }: DialogProps) {
  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <div className={styles.message}>{message}</div>
        <div className={styles.buttons}>
          <button className={`${styles.button} ${styles.confirm}`} onClick={onConfirm}>
            Sí
          </button>
          <button className={`${styles.button} ${styles.cancel}`} onClick={onCancel}>
            No
          </button>
        </div>
      </div>
    </div>
  );
}
