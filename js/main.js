import { ToastService } from './toast.js';
import { StorageService } from './storage.js';
import { ModalManager } from './modal.js';
import { ChartRenderer } from './chart.js';
import { DragAndDropManager } from './dnd.js';

class DashboardApp {
  constructor() {
    this.toast = new ToastService('toastContainer');
    this.storage = new StorageService(this.toast);
    this.modal = new ModalManager();

    this.gridEl = document.getElementById('dashboardGrid');
    this.emptyStateEl = document.getElementById('emptyState');
    this.counterBadgeEl = document.getElementById('widgetCounterBadge');
    this.themeBtnEl = document.getElementById('btnThemeToggle');

    this.state = this.storage.loadState();

    this.dnd = new DragAndDropManager(this.gridEl, (newOrderedIds) => {
      this.handleReorderWidgets(newOrderedIds);
    });

    this.initUI();
  }

  initUI() {
    this.applyTheme(this.state.theme);
    this.renderAllWidgets();
    this.bindToolbarEvents();
    this.bindModalFormEvents();

    window.addEventListener('resize', () => {
      this.redrawAllVisibleCharts();
    });
  }

  applyTheme(theme) {
    this.state.theme = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', this.state.theme);
    this.themeBtnEl.textContent = this.state.theme === 'dark' ? '☀️ Тема: Тёмная' : '🌙 Тема: Светлая';
    this.storage.saveState(this.state);
    this.redrawAllVisibleCharts();
  }

  bindToolbarEvents() {
    document.getElementById('btnAddWidget').addEventListener('click', () => {
      this.openAddWidgetModal();
    });

    document.getElementById('btnEmptyAddFirst').addEventListener('click', () => {
      this.openAddWidgetModal();
    });

    document.getElementById('btnRestoreDemo').addEventListener('click', () => {
      this.state.widgets = this.storage.getDefaultWidgets();
      this.storage.saveState(this.state);
      this.renderAllWidgets();
      this.toast.show('Примеры виджетов загружены', 'success');
    });

    document.getElementById('btnResetDashboard').addEventListener('click', () => {
      if (this.state.widgets.length === 0) {
        this.toast.show('Дашборд уже пуст', 'info');
        return;
      }
      this.modal.open('modalConfirmReset');
    });

    document.getElementById('btnConfirmResetYes').addEventListener('click', () => {
      this.state.widgets = [];
      this.storage.saveState(this.state);
      this.renderAllWidgets();
      this.modal.close();
      this.toast.show('Сброс выполнен', 'warning');
    });

    this.themeBtnEl.addEventListener('click', () => {
      const nextTheme = this.state.theme === 'light' ? 'dark' : 'light';
      this.applyTheme(nextTheme);
      this.toast.show(`Включена ${nextTheme === 'dark' ? 'тёмная' : 'светлая'} тема`, 'info');
    });
  }

  openAddWidgetModal() {
    const form = document.getElementById('formAddWidget');
    const titleInput = document.getElementById('inputWidgetTitle');
    const errorSpan = document.getElementById('errorWidgetTitle');

    form.reset();
    titleInput.classList.remove('input-error');
    errorSpan.textContent = '';

    document.querySelectorAll('[data-type-card]').forEach(card => {
      card.classList.toggle('selected', card.dataset.typeCard === 'note');
    });

    this.modal.open('modalAddWidget');
  }

  bindModalFormEvents() {
    const form = document.getElementById('formAddWidget');
    const titleInput = document.getElementById('inputWidgetTitle');
    const errorSpan = document.getElementById('errorWidgetTitle');

    document.querySelectorAll('[data-type-card]').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('[data-type-card]').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        const radio = card.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
      });
    });

    titleInput.addEventListener('input', () => {
      if (titleInput.value.trim()) {
        titleInput.classList.remove('input-error');
        errorSpan.textContent = '';
      }
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = titleInput.value.trim();

      if (!title) {
        titleInput.classList.add('input-error');
        errorSpan.textContent = 'Введите заголовок виджета';
        titleInput.focus();
        return;
      }

      const formData = new FormData(form);
      const type = formData.get('widgetType') || 'note';

      this.createNewWidget(type, title);
      this.modal.close();
    });
  }

  createNewWidget(type, title) {
    const id = `widget-${type}-${Date.now()}`;
    let defaultData = {};

    switch (type) {
      case 'note':
        defaultData = { text: 'Дважды кликните сюда, чтобы изменить текст заметки...' };
        break;
      case 'counter':
        defaultData = { value: 0, step: 1 };
        break;
      case 'todo':
        defaultData = {
          items: [
            { id: `task-${Date.now()}-1`, text: 'Новая задача', done: false }
          ]
        };
        break;
      case 'chart':
        defaultData = {
          values: [12, 25, 18, 34, 29]
        };
        break;
    }

    const newWidget = {
      id,
      type,
      title,
      collapsed: false,
      data: defaultData
    };

    this.state.widgets.push(newWidget);
    this.storage.saveState(this.state);

    const cardEl = this.createWidgetCardDOM(newWidget);
    this.gridEl.appendChild(cardEl);
    this.updateMetaUI();

    this.toast.show('Виджет добавлен', 'success');
  }

  deleteWidget(widgetId) {
    this.state.widgets = this.state.widgets.filter(w => w.id !== widgetId);
    this.storage.saveState(this.state);

    const cardEl = this.gridEl.querySelector(`[data-widget-id="${widgetId}"]`);
    if (cardEl) cardEl.remove();

    this.updateMetaUI();
    this.toast.show('Виджет удалён', 'info');
  }

  handleReorderWidgets(orderedIds) {
    const map = new Map(this.state.widgets.map(w => [w.id, w]));
    this.state.widgets = orderedIds.map(id => map.get(id)).filter(Boolean);
    this.storage.saveState(this.state);
    this.toast.show('Порядок виджетов обновлён', 'info');
  }

  updateMetaUI() {
    const count = this.state.widgets.length;
    this.counterBadgeEl.textContent = `Виджетов: ${count}`;
    this.emptyStateEl.hidden = count > 0;
  }

  renderAllWidgets() {
    this.gridEl.innerHTML = '';
    this.state.widgets.forEach(widget => {
      const cardEl = this.createWidgetCardDOM(widget);
      this.gridEl.appendChild(cardEl);
    });
    this.updateMetaUI();
  }

  createWidgetCardDOM(widget) {
    const article = document.createElement('article');
    article.className = `widget-card${widget.collapsed ? ' is-collapsed' : ''}`;
    article.dataset.widgetId = widget.id;
    article.setAttribute('draggable', 'true');

    const typeLabels = {
      note: 'Заметка',
      counter: 'Счётчик',
      todo: 'Задачи',
      chart: 'График'
    };

    const header = document.createElement('header');
    header.className = 'widget-header';

    const dragHandle = document.createElement('span');
    dragHandle.className = 'drag-handle';
    dragHandle.title = 'Перетащить';
    dragHandle.setAttribute('aria-label', 'Перетащить виджет');
    dragHandle.textContent = '⠿';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'widget-title-wrap';

    const typeBadge = document.createElement('span');
    typeBadge.className = 'widget-type-tag';
    typeBadge.textContent = typeLabels[widget.type] || widget.type;

    const titleEl = document.createElement('h2');
    titleEl.className = 'widget-title';
    titleEl.title = 'Двойной клик для изменения заголовка';
    titleEl.textContent = widget.title;

    const startEditingTitle = () => {
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'widget-title-input';
      input.value = widget.title;
      input.maxLength = 60;

      const commitTitle = () => {
        const nextTitle = input.value.trim();
        if (nextTitle) {
          widget.title = nextTitle;
          titleEl.textContent = nextTitle;
          this.storage.saveState(this.state);
        } else {
          this.toast.show('Заголовок не может быть пустым', 'error');
        }
        input.replaceWith(titleEl);
      };

      input.addEventListener('blur', commitTitle);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          input.blur();
        } else if (e.key === 'Escape') {
          input.value = widget.title;
          input.blur();
        }
      });

      titleEl.replaceWith(input);
      input.focus();
      input.select();
    };

    titleEl.addEventListener('dblclick', startEditingTitle);
    titleWrap.append(typeBadge, titleEl);

    const controls = document.createElement('div');
    controls.className = 'widget-controls';

    const editTitleBtn = document.createElement('button');
    editTitleBtn.type = 'button';
    editTitleBtn.className = 'icon-btn';
    editTitleBtn.title = 'Переименовать';
    editTitleBtn.setAttribute('aria-label', 'Переименовать виджет');
    editTitleBtn.textContent = '✎';
    editTitleBtn.addEventListener('click', startEditingTitle);

    const collapseBtn = document.createElement('button');
    collapseBtn.type = 'button';
    collapseBtn.className = 'icon-btn';
    collapseBtn.title = 'Свернуть / развернуть';
    collapseBtn.setAttribute('aria-label', 'Свернуть или развернуть виджет');
    collapseBtn.setAttribute('aria-expanded', String(!widget.collapsed));
    collapseBtn.textContent = widget.collapsed ? '▸' : '▾';

    collapseBtn.addEventListener('click', () => {
      widget.collapsed = !widget.collapsed;
      article.classList.toggle('is-collapsed', widget.collapsed);
      collapseBtn.textContent = widget.collapsed ? '▸' : '▾';
      collapseBtn.setAttribute('aria-expanded', String(!widget.collapsed));
      this.storage.saveState(this.state);
      if (!widget.collapsed && widget.type === 'chart') {
        this.redrawAllVisibleCharts();
      }
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'icon-btn delete-btn';
    deleteBtn.title = 'Удалить';
    deleteBtn.setAttribute('aria-label', 'Удалить виджет');
    deleteBtn.textContent = '✕';
    deleteBtn.addEventListener('click', () => this.deleteWidget(widget.id));

    controls.append(editTitleBtn, collapseBtn, deleteBtn);
    header.append(dragHandle, titleWrap, controls);

    const body = document.createElement('div');
    body.className = 'widget-body';

    switch (widget.type) {
      case 'note':
        this.buildNoteWidgetBody(widget, body);
        break;
      case 'counter':
        this.buildCounterWidgetBody(widget, body);
        break;
      case 'todo':
        this.buildTodoWidgetBody(widget, body);
        break;
      case 'chart':
        this.buildChartWidgetBody(widget, body);
        break;
    }

    article.append(header, body);
    return article;
  }

  buildNoteWidgetBody(widget, container) {
    const display = document.createElement('div');
    display.className = 'note-display';
    display.tabIndex = 0;
    display.textContent = widget.data.text || 'Пустая заметка (дважды кликните для редактирования)';

    const hint = document.createElement('div');
    hint.className = 'note-hint';
    hint.innerHTML = '<span>Двойной клик для редактирования</span>';

    const enterEditMode = () => {
      const textarea = document.createElement('textarea');
      textarea.className = 'note-textarea';
      textarea.value = widget.data.text || '';

      const saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.className = 'btn btn-primary btn-sm';
      saveBtn.textContent = 'Сохранить';

      const commitNote = () => {
        widget.data.text = textarea.value.trim() || 'Пустая заметка';
        display.textContent = widget.data.text;
        this.storage.saveState(this.state);
        container.replaceChildren(display, hint);
        this.toast.show('Заметка сохранена', 'success');
      };

      saveBtn.addEventListener('click', commitNote);
      textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          container.replaceChildren(display, hint);
        }
      });

      container.replaceChildren(textarea, saveBtn);
      textarea.focus();
    };

    display.addEventListener('dblclick', enterEditMode);
    display.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') enterEditMode();
    });

    container.append(display, hint);
  }

  buildCounterWidgetBody(widget, container) {
    const box = document.createElement('div');
    box.className = 'counter-box';

    const valEl = document.createElement('div');
    valEl.className = 'counter-value';
    valEl.textContent = String(widget.data.value ?? 0);

    const btnGroup = document.createElement('div');
    btnGroup.className = 'counter-buttons';

    const btnMinus = document.createElement('button');
    btnMinus.type = 'button';
    btnMinus.className = 'counter-btn';
    btnMinus.setAttribute('aria-label', 'Уменьшить');
    btnMinus.textContent = '−';

    const btnPlus = document.createElement('button');
    btnPlus.type = 'button';
    btnPlus.className = 'counter-btn';
    btnPlus.setAttribute('aria-label', 'Увеличить');
    btnPlus.textContent = '+';

    const stepRow = document.createElement('div');
    stepRow.className = 'counter-step-row';

    const stepLabel = document.createElement('label');
    stepLabel.textContent = 'Шаг:';

    const stepInput = document.createElement('input');
    stepInput.type = 'number';
    stepInput.className = 'input-field counter-step-input';
    stepInput.min = '1';
    stepInput.max = '1000';
    stepInput.value = String(widget.data.step || 1);

    stepInput.addEventListener('change', () => {
      const parsedStep = Math.max(1, parseInt(stepInput.value, 10) || 1);
      stepInput.value = String(parsedStep);
      widget.data.step = parsedStep;
      this.storage.saveState(this.state);
    });

    btnMinus.addEventListener('click', () => {
      const step = Number(widget.data.step) || 1;
      widget.data.value = (Number(widget.data.value) || 0) - step;
      valEl.textContent = String(widget.data.value);
      this.storage.saveState(this.state);
    });

    btnPlus.addEventListener('click', () => {
      const step = Number(widget.data.step) || 1;
      widget.data.value = (Number(widget.data.value) || 0) + step;
      valEl.textContent = String(widget.data.value);
      this.storage.saveState(this.state);
    });

    btnGroup.append(btnMinus, btnPlus);
    stepRow.append(stepLabel, stepInput);
    box.append(valEl, btnGroup, stepRow);
    container.appendChild(box);
  }

  buildTodoWidgetBody(widget, container) {
    if (!Array.isArray(widget.data.items)) {
      widget.data.items = [];
    }

    const form = document.createElement('form');
    form.className = 'todo-form';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'input-field';
    input.placeholder = 'Добавить задачу...';
    input.maxLength = 80;

    const addBtn = document.createElement('button');
    addBtn.type = 'submit';
    addBtn.className = 'btn btn-primary btn-sm';
    addBtn.textContent = '+';

    form.append(input, addBtn);

    const listEl = document.createElement('ul');
    listEl.className = 'todo-list';

    const statsEl = document.createElement('div');
    statsEl.className = 'todo-stats';

    const renderList = () => {
      listEl.innerHTML = '';
      const items = widget.data.items;

      items.forEach(item => {
        const li = document.createElement('li');
        li.className = `todo-item${item.done ? ' completed' : ''}`;

        const label = document.createElement('label');
        label.className = 'todo-label';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = Boolean(item.done);
        checkbox.addEventListener('change', () => {
          item.done = checkbox.checked;
          this.storage.saveState(this.state);
          renderList();
        });

        const span = document.createElement('span');
        span.className = 'todo-text';
        span.textContent = item.text;

        label.append(checkbox, span);

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'icon-btn delete-btn';
        delBtn.setAttribute('aria-label', 'Удалить задачу');
        delBtn.textContent = '✕';
        delBtn.addEventListener('click', () => {
          widget.data.items = widget.data.items.filter(t => t.id !== item.id);
          this.storage.saveState(this.state);
          renderList();
        });

        li.append(label, delBtn);
        listEl.appendChild(li);
      });

      const doneCount = items.filter(i => i.done).length;
      statsEl.textContent = `Выполнено: ${doneCount} из ${items.length}`;
    };

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;

      widget.data.items.push({
        id: `todo-${Date.now()}`,
        text,
        done: false
      });
      input.value = '';
      this.storage.saveState(this.state);
      renderList();
    });

    renderList();
    container.append(form, listEl, statsEl);
  }

  buildChartWidgetBody(widget, container) {
    const stage = document.createElement('div');
    stage.className = 'chart-stage';

    const canvas = document.createElement('canvas');
    canvas.className = 'chart-canvas';
    stage.appendChild(canvas);

    const form = document.createElement('form');
    form.className = 'chart-controls-form';

    const row = document.createElement('div');
    row.className = 'chart-controls-row';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'input-field';
    input.value = (widget.data.values || [10, 25, 18, 40]).join(', ');
    input.placeholder = 'Значения через запятую: 10, 25, 40';
    input.setAttribute('aria-label', 'Значения графика');

    const updateBtn = document.createElement('button');
    updateBtn.type = 'submit';
    updateBtn.className = 'btn btn-primary btn-sm';
    updateBtn.textContent = 'Обновить';

    row.append(input, updateBtn);
    form.appendChild(row);

    // имитация асинхронной загрузки данных с возможной ошибкой
    const loadChartAsync = () => {
      stage.querySelectorAll('.chart-loader, .chart-error').forEach(el => el.remove());

      const loader = document.createElement('div');
      loader.className = 'chart-loader';
      loader.innerHTML = '<div class="spinner"></div><span>Загрузка данных...</span>';
      stage.appendChild(loader);

      const delay = Math.floor(500 + Math.random() * 500);

      new Promise((resolve, reject) => {
        setTimeout(() => {
          // 25% шанс ошибки для проверки кнопки Повторить
          if (Math.random() < 0.25) {
            reject(new Error('Ошибка загрузки данных графика'));
          } else {
            resolve(widget.data.values);
          }
        }, delay);
      })
        .then((values) => {
          loader.remove();
          ChartRenderer.drawBarChart(canvas, values);
        })
        .catch((err) => {
          loader.remove();
          const errorBox = document.createElement('div');
          errorBox.className = 'chart-error';

          const msg = document.createElement('p');
          msg.style.color = 'var(--danger)';
          msg.style.fontWeight = '600';
          msg.textContent = err.message;

          const retryBtn = document.createElement('button');
          retryBtn.type = 'button';
          retryBtn.className = 'btn btn-primary btn-sm';
          retryBtn.textContent = 'Повторить';
          retryBtn.addEventListener('click', () => loadChartAsync());

          errorBox.append(msg, retryBtn);
          stage.appendChild(errorBox);
        });
    };

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const parsed = input.value
        .split(',')
        .map(s => parseFloat(s.trim()))
        .filter(n => !Number.isNaN(n) && n >= 0)
        .slice(0, 12);

      if (parsed.length === 0) {
        this.toast.show('Введите числа через запятую', 'error');
        return;
      }

      widget.data.values = parsed;
      input.value = parsed.join(', ');
      this.storage.saveState(this.state);
      loadChartAsync();
    });

    container.append(stage, form);
    loadChartAsync();
  }

  redrawAllVisibleCharts() {
    this.state.widgets.forEach(widget => {
      if (widget.type === 'chart' && !widget.collapsed) {
        const cardEl = this.gridEl.querySelector(`[data-widget-id="${widget.id}"]`);
        if (!cardEl) return;
        const canvas = cardEl.querySelector('canvas');
        const hasLoaderOrError = cardEl.querySelector('.chart-loader, .chart-error');
        if (canvas && !hasLoaderOrError) {
          ChartRenderer.drawBarChart(canvas, widget.data.values);
        }
      }
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new DashboardApp();
});