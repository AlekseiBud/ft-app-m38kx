import { Component, OnInit, ViewChild, ElementRef, signal, effect, inject, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

interface Transaction {
  amount: string;
  category: string;
  type: 'Расход' | 'Доход';
  date: string;
  note: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [], // Больше не нужны CommonModule и модули HTTP!
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App implements OnInit {
  @ViewChild('amountInput') amountInput!: ElementRef<HTMLInputElement>;

  // Современный инжект вместо конструктора
  private http = inject(HttpClient);

  // Динамические настройки безопасности через Signals
  scriptUrl = signal<string>('');
  appPin = signal<string>('');

  // Состояния экранов
  isAuthorized = signal<boolean>(false);
  showSettingsModal = signal<boolean>(false);

  // Поля ввода для модального окна настроек
  inputUrl = signal<string>('');
  inputPin = signal<string>('');

  // Состояние формы
  loading = signal<boolean>(false);
  categories = ['Еда', 'Транспорт', 'Здоровье', 'Красота', 'Гигиена', 'Одежда', 'Оборудование', 'Провайдерам', 'Развлечения', 'Другое', 'Мусор'];
  transaction = signal<Transaction>(this.getDefaultTransaction());

  // Сигнал количества транзакций, ждущих отправки в оффлайне
  offlineQueueCount = signal<number>(0);

  // Сигналы для подсветки дат:
  isTodayActive = computed(() => this.transaction().date === this.formatDate(new Date()));
  isYesterdayActive = computed(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return this.transaction().date === this.formatDate(d);
  });

  // Поле для ввода пин-кода на экране блокировки
  loginPin = signal<string>('');

  // ВЫЧИСЛЯЕМЫЙ СИГНАЛ ДЛЯ ВАЛИДАЦИИ (Лайфхак)
  isFormInvalid = computed(() => {
    const current = this.transaction();
    const amountNum = parseFloat(current.amount);
    
    // Проверяем: сумма должна быть числом и строго больше 0
    const isAmountInvalid = isNaN(amountNum) || amountNum <= 0;
    
    // Проверяем: дата должна быть заполнена и соответствовать формату ДД.ММ.ГГГГ (10 символов)
    const isDateInvalid = !current.date || current.date.trim().length !== 10;
    
    return isAmountInvalid || isDateInvalid;
  });

  constructor() {
    effect(() => {
      if (this.isAuthorized() && this.amountInput && !this.showSettingsModal()) {
        setTimeout(() => this.amountInput.nativeElement.focus(), 100);
      }
    });
  }

  ngOnInit() {
    try {
      this.loadSettings();
      this.checkAccess();
      this.updateQueueCount();
      this.setupOnlineListener();
    } catch (e) {
      console.error('Ошибка инициализации приложения: ', e);
    }
  }

  private loadSettings() {
    this.scriptUrl.set(localStorage.getItem('app_script_url') || '');
    this.appPin.set(localStorage.getItem('app_pin') || '');
    this.inputUrl.set(this.scriptUrl());
    this.inputPin.set(this.appPin());
  }

  // Навешиваем слушатель на восстановление интернета
  private setupOnlineListener() {
    window.addEventListener('online', () => {
      // Как только сеть появилась, запускаем выгрузку накопленных данных
      this.syncOfflineQueue();
    });
    
    // На всякий случай пробуем запуститься при старте, если сеть уже есть
    if (navigator.onLine) {
      this.syncOfflineQueue();
    }
  }

  private updateQueueCount() {
    const queue = this.getQueueFromStorage();
    this.offlineQueueCount.set(queue.length);
  }

  private getQueueFromStorage(): any[] {
    const data = localStorage.getItem('offline_budget_queue');
    return data ? JSON.parse(data) : [];
  }

  private saveQueueToStorage(queue: any[]) {
    localStorage.setItem('offline_budget_queue', JSON.stringify(queue));
    this.updateQueueCount();
  }

  // Вспомогательный метод для безопасного вызова вибрации
  private triggerVibration(pattern: number | number[]) {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern); [1]
    }
  }

  private getDefaultTransaction(): Transaction {
    return {
      amount: '',
      category: 'Еда',
      type: 'Расход',
      date: this.formatDate(new Date()),
      note: ''
    };
  }

  checkAccess() {
    const savedPin = this.appPin();

    if (!savedPin || !this.scriptUrl()) {
      this.showSettingsModal.set(true);
      return;
    }
    // Страница просто покажет форму ввода вместо системного prompt()
  }

  submitLogin() {
    if (this.loginPin() === this.appPin()) {
      this.isAuthorized.set(true);
      this.triggerVibration(200);
      this.loginPin.set(''); // Очищаем поле после успешного входа
    } else {
      this.triggerVibration(600);
      alert('Доступ запрещен');
    }
  }

  // 4. Метод на случай, если вы забыли ПИН-код (полный сброс):
  resetApp() {
    if (confirm('Вы уверены, что хотите сбросить настройки? Все локальные данные и ПИН-код будут удалены.')) {
      localStorage.clear();
      location.reload();
    }
  }

  saveSettings() {
    if (!this.inputUrl() || !this.inputPin()) {
      alert('Все поля должны быть заполнены!');
      return;
    }

    localStorage.setItem('app_script_url', this.inputUrl());
    localStorage.setItem('app_pin', this.inputPin());
    
    this.scriptUrl.set(this.inputUrl());
    this.appPin.set(this.inputPin());
    
    this.showSettingsModal.set(false);
    this.isAuthorized.set(true);
    this.triggerVibration(200);
  }

  updateField(field: keyof Transaction, value: any) {
    this.transaction.update(t => ({ ...t, [field]: value }));
  }

  setQuickDate(offset: number) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    this.updateField('date', this.formatDate(d));
  }

  private formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}.${month}.${date.getFullYear()}`;
  }

  saveTransaction() {
    // Двойная проверка перед отправкой
    if (this.isFormInvalid() || this.loading()) {
      this.triggerVibration(500); // Ошибка — длинная вибрация [4]
      return;
    }

    const current = this.transaction();
    if (!current.amount || !current.date) return;
    
    this.loading.set(true);

    const payload = {
      ...current,
      category: current.type === 'Доход' ? 'Доход' : current.category,
      amount: parseFloat(current.amount)
    };

    // ПРОВЕРКА НАЛИЧИЯ ИНТЕРНЕТА В МОМЕНТ НАЖАТИЯ
    if (!navigator.onLine) {
      // Оффлайн режим: сохраняем локально
      const queue = this.getQueueFromStorage();
      queue.push(payload);
      this.saveQueueToStorage(queue);
      this.loading.set(false);
      this.triggerVibration([100, 50, 100]);
      alert('Сохранено в оффлайн-очередь 📱');
      this.transaction.set(this.getDefaultTransaction());
      return;
    }

    // Онлайн режим: обычная отправка
    this.sendToServer(payload);
  }

  private sendToServer(payload: any, isSync = false) {
    if (!isSync) this.loading.set(true);

    this.http.post(this.scriptUrl(), JSON.stringify(payload)).subscribe({
      next: () => {
        if (!isSync) {
          this.loading.set(false);
          this.transaction.set(this.getDefaultTransaction());
          // Один короткий виброотклик — успешно улетело на сервер [4]
          this.triggerVibration(200);
        }
      },
      error: (err) => {
        if (!isSync) {
          this.loading.set(false);
          // Если запрос сорвался (например сеть пропала в процессе), бэкапим в оффлайн
          const queue = this.getQueueFromStorage();
          queue.push(payload);
          this.saveQueueToStorage(queue);

          // Сбой сети в процессе — длинная вибрация [4]
          this.triggerVibration(500);

          alert('Ошибка сети. Сохранено локально.');
          this.transaction.set(this.getDefaultTransaction());
        }
        console.error(err);
      }
    });
  }

  // Фоновая синхронизация всей очереди при появлении сети
  private async syncOfflineQueue() {
    const queue = this.getQueueFromStorage();
    if (queue.length === 0 || !this.scriptUrl()) return;

    console.log(`Найдено ${queue.length} записей для синхронизации...`);
    
    // Копируем очередь, чтобы безопасно отправлять элементы
    const itemsToSend = [...queue];
    
    for (const item of itemsToSend) {
      try {
        // Превращаем HttpClient в Promise для последовательной отправки (чтобы строки в таблице не перепутались)
        await firstValueFrom(this.http.post(this.scriptUrl(), JSON.stringify(item)));
        
        // После успешной отправки удаляем именно этот элемент из локального хранилища
        const currentQueue = this.getQueueFromStorage();
        currentQueue.shift(); // Удаляем самый первый/старый элемент
        this.saveQueueToStorage(currentQueue);
      } catch (err) {
        console.error('Сбой синхронизации', err);
        break; // Если один упал, прерываем цикл
      }
    }
    this.loading.set(false);
  }
}
