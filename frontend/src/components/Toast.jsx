import { useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

const toastIcons = {
  error: AlertTriangle,
  success: CheckCircle2,
  info: Info,
};

const toastTitles = {
  error: 'Error',
  success: 'Success',
  info: 'Notice',
};

const Toast = ({ toast, onClose }) => {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(onClose, toast.duration || 4500);
    return () => window.clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const type = toast.type || 'info';
  const Icon = toastIcons[type] || Info;

  return (
    <div className={`toast-alert toast-${type}`} role="alert" aria-live="assertive">
      <div className="toast-icon">
        <Icon size={18} />
      </div>
      <div className="toast-copy">
        <strong>{toast.title || toastTitles[type]}</strong>
        <p>{toast.message}</p>
      </div>
      <button aria-label="Close alert" className="toast-close" onClick={onClose} type="button">
        <X size={16} />
      </button>
    </div>
  );
};

export default Toast;
