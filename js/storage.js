export class StorageService {
  static STORAGE_KEY = 'dashboard_state';
  static CURRENT_VERSION = 2;

  constructor(toastService) {
    this.toast = toastService;
  }

  getDefaultWidgets() {
    return [
      {
        id: 'widget-note-1',
        type: 'note',
        title: 'Заметки на неделю',
        collapsed: false,
        data: {
          text: 'Сходить в магазин\n\nПосмотреть расписание пар в пятницу и забрать посылку из озона.'
        }
      },
      {
        id: 'widget-counter-2',
        type: 'counter',
        title: 'Кружки кофе за сегодня',
        collapsed: false,
        data: {
          value: 2,
          step: 1
        }
      },
      {
        id: 'widget-todo-3',
        type: 'todo',
        title: 'Текущие задачи',
        collapsed: false,
        data: {
          items: [
            { id: 't1', text: 'Выгулить собаку', done: true },
            { id: 't2', text: 'Купить молоко', done: false },
            { id: 't3', text: 'Сходить в зальчик', done: true },
            { id: 't4', text: 'Сделать английский', done: false }
          ]
        }
      },
      {
        id: 'widget-chart-4',
        type: 'chart',
        title: 'Закрытые задачи по дням',
        collapsed: false,
        data: {
          values: [4, 7, 5, 11, 8, 14, 6]
        }
      }
    ];
  }

  loadState() {
    const raw = localStorage.getItem(StorageService.STORAGE_KEY);
    if (!raw) {
      return {
        version: StorageService.CURRENT_VERSION,
        theme: 'light',
        widgets: this.getDefaultWidgets()
      };
    }

    try {
      const parsed = JSON.parse(raw);

      const isValid =
        parsed &&
        typeof parsed === 'object' &&
        parsed.version === StorageService.CURRENT_VERSION &&
        Array.isArray(parsed.widgets) &&
        parsed.widgets.every(
          w => w && typeof w.id === 'string' && typeof w.type === 'string' && typeof w.title === 'string'
        );

      if (!isValid) {
        throw new Error('Invalid schema version or corrupted data');
      }

      return {
        version: StorageService.CURRENT_VERSION,
        theme: parsed.theme === 'dark' ? 'dark' : 'light',
        widgets: parsed.widgets
      };
    } catch (err) {
      console.warn('Ошибка чтения localStorage, сброс на пустой дашборд:', err);
      if (this.toast) {
        this.toast.show('Данные в хранилище повреждены или устарели, дашборд сброшен', 'warning');
      }
      const fallback = {
        version: StorageService.CURRENT_VERSION,
        theme: 'light',
        widgets: []
      };
      this.saveState(fallback);
      return fallback;
    }
  }

  saveState(state) {
    try {
      const payload = {
        version: StorageService.CURRENT_VERSION,
        theme: state.theme,
        widgets: state.widgets
      };
      localStorage.setItem(StorageService.STORAGE_KEY, JSON.stringify(payload));
    } catch (err) {
      console.error('Ошибка сохранения в localStorage:', err);
    }
  }
}