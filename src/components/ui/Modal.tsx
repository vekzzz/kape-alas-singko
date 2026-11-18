import { useEffect, useRef, type ReactNode } from 'react';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
};

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
