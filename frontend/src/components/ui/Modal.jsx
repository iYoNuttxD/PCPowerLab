import Button from './Button.jsx';

export default function Modal({ open, title, children, onClose }) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="modal-panel" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
        </div>
        {children}
      </div>
    </div>
  );
}
