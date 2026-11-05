export class DragAndDropManager {
  constructor(gridElement, onReorderCallback) {
    this.grid = gridElement;
    this.onReorder = onReorderCallback;
    this.draggedCard = null;
    this.initEvents();
  }

  initEvents() {
    this.grid.addEventListener('dragstart', (e) => {
      const card = e.target.closest('.widget-card');
      if (!card) return;

      const activeTag = document.activeElement ? document.activeElement.tagName : '';
      if (['INPUT', 'TEXTAREA'].includes(activeTag)) {
        e.preventDefault();
        return;
      }

      this.draggedCard = card;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', card.dataset.widgetId);

      requestAnimationFrame(() => {
        card.classList.add('dragging');
      });
    });

    this.grid.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!this.draggedCard) return;

      e.dataTransfer.dropEffect = 'move';
      const targetCard = e.target.closest('.widget-card');

      this.clearDragOverStyles();
      if (targetCard && targetCard !== this.draggedCard) {
        targetCard.classList.add('drag-over');
      }
    });

    this.grid.addEventListener('dragleave', (e) => {
      const targetCard = e.target.closest('.widget-card');
      if (targetCard) {
        targetCard.classList.remove('drag-over');
      }
    });

    this.grid.addEventListener('drop', (e) => {
      e.preventDefault();
      if (!this.draggedCard) return;

      const targetCard = e.target.closest('.widget-card');
      this.clearDragOverStyles();

      if (targetCard && targetCard !== this.draggedCard) {
        this.swapCardsInDOM(this.draggedCard, targetCard);
      }
    });

    this.grid.addEventListener('dragend', () => {
      if (this.draggedCard) {
        this.draggedCard.classList.remove('dragging');
        this.draggedCard = null;
      }
      this.clearDragOverStyles();
    });

    this.grid.addEventListener('touchstart', (e) => {
      const handle = e.target.closest('.drag-handle');
      if (!handle) return;

      const card = handle.closest('.widget-card');
      if (!card) return;

      this.draggedCard = card;
      card.classList.add('dragging');
    }, { passive: true });

    this.grid.addEventListener('touchmove', (e) => {
      if (!this.draggedCard) return;
      if (e.cancelable) e.preventDefault();

      const touch = e.touches[0];
      const elemUnderFinger = document.elementFromPoint(touch.clientX, touch.clientY);
      const targetCard = elemUnderFinger ? elemUnderFinger.closest('.widget-card') : null;

      this.clearDragOverStyles();
      if (targetCard && targetCard !== this.draggedCard) {
        targetCard.classList.add('drag-over');
      }
    }, { passive: false });

    this.grid.addEventListener('touchend', (e) => {
      if (!this.draggedCard) return;

      const touch = e.changedTouches[0];
      const elemUnderFinger = document.elementFromPoint(touch.clientX, touch.clientY);
      const targetCard = elemUnderFinger ? elemUnderFinger.closest('.widget-card') : null;

      this.draggedCard.classList.remove('dragging');
      this.clearDragOverStyles();

      if (targetCard && targetCard !== this.draggedCard) {
        this.swapCardsInDOM(this.draggedCard, targetCard);
      }

      this.draggedCard = null;
    });
  }

  clearDragOverStyles() {
    this.grid.querySelectorAll('.widget-card.drag-over').forEach(el => {
      el.classList.remove('drag-over');
    });
  }

  swapCardsInDOM(sourceCard, targetCard) {
    const cards = Array.from(this.grid.querySelectorAll('.widget-card'));
    const sourceIndex = cards.indexOf(sourceCard);
    const targetIndex = cards.indexOf(targetCard);

    if (sourceIndex < 0 || targetIndex < 0) return;

    if (sourceIndex < targetIndex) {
      targetCard.after(sourceCard);
    } else {
      targetCard.before(sourceCard);
    }

    const newOrderedIds = Array.from(this.grid.querySelectorAll('.widget-card')).map(
      el => el.dataset.widgetId
    );
    this.onReorder(newOrderedIds);
  }
}