import { useEffect, useId, useRef } from 'react';
import Button from './Button.jsx';

export default function Modal({ open, title, children, onClose, className = '', initialFocusSelector = null }) {
  const dialogRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    const opener = document.activeElement;
    dialog.showModal();
    if (initialFocusSelector) dialog.querySelector(initialFocusSelector)?.focus({ preventScroll: true });
    // Native modal dialogs make the underlying page inert, including nested dialogs.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [open, initialFocusSelector]);

  if (!open) return null;

  return (
    <dialog ref={dialogRef} className={`modal-panel ${className}`} aria-labelledby={titleId}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        const controls = [...event.currentTarget.querySelectorAll('a[href], button, input, select, textarea, [tabindex]')]
          .filter((element) => !element.disabled && element.tabIndex >= 0 && element.getClientRects().length > 0);
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault(); last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first?.focus();
        }
      }}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
      }}>
      <div className="modal-header">
        <h2 id={titleId}>{title}</h2>
        <Button type="button" variant="ghost" onClick={onClose}>Fechar</Button>
      </div>
      {children}
    </dialog>
  );
}
