import styles from './Dialog.module.css';

interface DialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  singleAction?: boolean;
}

export function Dialog({ message, onConfirm, onCancel, singleAction }: DialogProps) {
  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <div className={styles.message}>{message}</div>
        <div className={styles.buttons}>
          {singleAction ? (
            <button className={`${styles.button} ${styles.confirm}`} onClick={onConfirm}>
              Entendido
            </button>
          ) : (
            <>
              <button className={`${styles.button} ${styles.confirm}`} onClick={onConfirm}>
                Sí
              </button>
              <button className={`${styles.button} ${styles.cancel}`} onClick={onCancel}>
                No
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
