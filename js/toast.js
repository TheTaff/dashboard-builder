export class ToastService {
  constructor(containerId = 'toastContainer') {
    this.container = document.getElementById(containerId);
  }

  show(message, type = 'info') {
    if (!this.container) return;

    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;
    toast.setAttribute('role', 'status');

    const textSpan = document.createElement('span');
    textSpan.textContent = message;

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'icon-btn';
    closeBtn.setAttribute('aria-label', 'Закрыть уведомление');
    closeBtn.textContent = '✕';

    const removeToast = () => {
      if (toast.parentNode) {
        toast.remove();
      }
    };

    closeBtn.addEventListener('click', removeToast);
    toast.append(textSpan, closeBtn);
    this.container.appendChild(toast);

    setTimeout(removeToast, 3000);
  }
}