import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, HelpCircle, X } from 'lucide-react';
import { continueDialogQueue, subscribeDialog } from '../services/dialogService';

const icons = { warning: AlertTriangle, success: CheckCircle2, question: HelpCircle };

const GlobalDialog = () => {
  const [dialog, setDialog] = useState(null);
  const [value, setValue] = useState('');
  const [validation, setValidation] = useState('');
  const inputRef = useRef(null);

  const finish = useCallback((result) => {
    if (!dialog) return;
    const completed = dialog;
    setDialog(null);
    completed.resolve(result);
    continueDialogQueue();
  }, [dialog]);

  useEffect(() => {
    return subscribeDialog((next) => {
      setDialog(next);
      setValue(next.defaultValue || '');
      setValidation('');
    });
  }, []);

  useEffect(() => {
    if (!dialog) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = setTimeout(() => inputRef.current?.focus(), 80);
    const onKeyDown = (event) => {
      if (event.key === 'Escape') finish(null);
      if (event.key === 'Enter' && dialog.mode === 'confirm') finish(true);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [dialog, finish]);

  const submit = () => {
    if (dialog.mode === 'confirm') return finish(true);
    if (dialog.required && !value.trim()) {
      setValidation('This field is required before you can continue.');
      inputRef.current?.focus();
      return;
    }
    finish(value);
  };

  if (!dialog) return null;
  const Icon = icons[dialog.type] || HelpCircle;

  return (
    <div className="global-dialog-backdrop" role="presentation" onMouseDown={() => finish(dialog.mode === 'confirm' ? false : null)}>
      <section className="global-dialog" role="alertdialog" aria-modal="true" aria-labelledby="global-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className={`global-dialog-header is-${dialog.destructive ? 'danger' : dialog.type}`}>
          <span className="global-dialog-icon"><Icon size={25} /></span>
          <button type="button" aria-label="Close dialog" onClick={() => finish(dialog.mode === 'confirm' ? false : null)}><X size={19} /></button>
          <h2 id="global-dialog-title">{dialog.title}</h2>
          <p>Review the information carefully before continuing.</p>
        </header>
        <div className="global-dialog-body">
          <p className="global-dialog-message">{dialog.message}</p>
          {dialog.mode === 'prompt' && (
            <label className="global-dialog-field">
              <span>Your response {dialog.required && <em>Required</em>}</span>
              {dialog.multiline
                ? <textarea ref={inputRef} rows="4" value={value} placeholder={dialog.placeholder} onChange={(event) => { setValue(event.target.value); setValidation(''); }} />
                : <input ref={inputRef} type={dialog.inputType} value={value} placeholder={dialog.placeholder} onChange={(event) => { setValue(event.target.value); setValidation(''); }} />}
              {validation && <small>{validation}</small>}
            </label>
          )}
          <footer className="global-dialog-actions">
            <button type="button" className="global-dialog-cancel" onClick={() => finish(dialog.mode === 'confirm' ? false : null)}>{dialog.cancelLabel}</button>
            <button type="button" className={`global-dialog-confirm ${dialog.destructive ? 'is-danger' : ''}`} onClick={submit}>{dialog.confirmLabel}</button>
          </footer>
        </div>
      </section>
    </div>
  );
};

export default GlobalDialog;
