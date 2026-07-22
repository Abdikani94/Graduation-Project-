let dialogListener = null;
const waitingDialogs = [];

const dispatchNext = () => {
  if (!dialogListener || !waitingDialogs.length) return;
  dialogListener(waitingDialogs.shift());
};

const requestDialog = (configuration) => new Promise((resolve) => {
  waitingDialogs.push({ ...configuration, resolve });
  dispatchNext();
});

export const subscribeDialog = (listener) => {
  dialogListener = listener;
  dispatchNext();
  return () => { if (dialogListener === listener) dialogListener = null; };
};

export const continueDialogQueue = () => setTimeout(dispatchNext, 0);

export const confirmDialog = (message, options = {}) => requestDialog({
  type: options.type || 'warning', mode: 'confirm', title: options.title || 'Confirm action', message,
  confirmLabel: options.confirmLabel || 'Confirm', cancelLabel: options.cancelLabel || 'Cancel',
  destructive: options.destructive === true
});

export const promptDialog = (message, defaultValue = '', options = {}) => requestDialog({
  type: options.type || 'question', mode: 'prompt', title: options.title || 'Additional information', message,
  defaultValue, placeholder: options.placeholder || '', confirmLabel: options.confirmLabel || 'Continue',
  cancelLabel: options.cancelLabel || 'Cancel', required: options.required === true,
  multiline: options.multiline !== false, inputType: options.inputType || 'text'
});
