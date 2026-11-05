export class ModalManager {
  constructor() {
    this.activeModal = null;
    this.previousActiveElement = null;
    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.initCloseListeners();
  }

  initCloseListeners() {
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          this.close();
        }
      });

      backdrop.querySelectorAll('[data-close-modal]').forEach(btn => {
        btn.addEventListener('click', () => this.close());
      });
    });
  }

  open(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    this.previousActiveElement = document.activeElement;
    this.activeModal = modal;
    modal.hidden = false;
    document.body.classList.add('modal-open');

    document.addEventListener('keydown', this.boundKeyDown);

    const focusable = this.getFocusableElements(modal);
    if (focusable.length > 0) {
      setTimeout(() => focusable[0].focus(), 15);
    }
  }

  close() {
    if (!this.activeModal) return;

    this.activeModal.hidden = true;
    document.body.classList.remove('modal-open');
    document.removeEventListener('keydown', this.boundKeyDown);

    if (this.previousActiveElement && typeof this.previousActiveElement.focus === 'function') {
      this.previousActiveElement.focus();
    }

    this.activeModal = null;
  }

  getFocusableElements(container) {
    const selector = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])'
    ].join(',');

    return Array.from(container.querySelectorAll(selector)).filter(
      el => !el.hidden && el.offsetParent !== null
    );
  }

  handleKeyDown(e) {
    if (!this.activeModal) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      this.close();
      return;
    }

    if (e.key === 'Tab') {
      const focusable = this.getFocusableElements(this.activeModal);
      if (focusable.length === 0) return;

      const firstEl = focusable[0];
      const lastEl = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    }
  }
}