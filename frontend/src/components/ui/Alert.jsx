import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

const icons = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
  info: Info
};

export default function Alert({ type = 'info', title, children }) {
  const Icon = icons[type] || Info;

  return (
    <div className={`alert alert-${type}`} role={type === 'error' ? 'alert' : 'status'}>
      <Icon size={20} aria-hidden="true" />
      <div>
        {title && <strong>{title}</strong>}
        <div>{children}</div>
      </div>
    </div>
  );
}
