import { useEffect, useRef, type ReactNode } from 'react';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
};

/**
 * A side panel (a bottom sheet on phones) built on the native <dialog>,
 * which gives us the focus trap and Escape to close for free.
 */
export function Modal({ open, onClose, label, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="panel"
      aria-label={label}
      onClose={onClose}
      onClick={(event) => {
        // A click on the dialog itself (not its content) is a click on the backdrop.
        if (event.target === dialogRef.current) onClose();
      }}
    >
      <div className="panel-in">
        <button type="button" className="text-btn close" onClick={onClose}>
          Close
        </button>
        {open && children}
      </div>
    </dialog>
  );
}
