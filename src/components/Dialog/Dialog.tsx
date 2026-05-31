import styles from './Dialog.module.css';

interface DialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  singleAction?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function Dialog({ message, onConfirm, onCancel, singleAction, confirmLabel, cancelLabel }: DialogProps) {
  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <div className={styles.message}>{message}</div>
        <div className={styles.buttons}>
          {singleAction ? (
            <button className={`${styles.button} ${styles.confirm}`} onClick={onConfirm}>
              {confirmLabel ?? 'Entendido'}
            </button>
          ) : (
            <>
              <button className={`${styles.button} ${styles.confirm}`} onClick={onConfirm}>
                {confirmLabel ?? 'Sí'}
              </button>
              <button className={`${styles.button} ${styles.cancel}`} onClick={onCancel}>
                {cancelLabel ?? 'No'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
