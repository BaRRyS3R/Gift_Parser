// src/utils/devtools-protection.ts
// Защита от DevTools с использованием современных методов детекции

interface DetectionState {
  isOpen: boolean;
  frozen: boolean;
  detectionMethods: Set<string>;
}

// Локальные типы для расширенных возможностей браузера
type DeviceMemoryNavigator = Navigator & {
  deviceMemory?: number;
  getBattery?: () => Promise<any>;
}

type TelegramWindow = Window & {
  Telegram?: {
    WebApp?: {
      platform?: string;
      [key: string]: any;
    };
  };
  chrome?: {
    runtime?: {
      id?: string;
      [key: string]: any;
    };
  };
}

class DevToolsProtection {
  private state: DetectionState = {
    isOpen: false,
    frozen: false,
    detectionMethods: new Set()
  };
  
  private originalFunctions: Map<string, any> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;
  private worker: Worker | null = null;
  
  // Обфусцированная проверка для затруднения обхода
  private obfuscatedCheck(): void {
    const _0x1234 = () => {
      const start = Date.now();
      debugger;
      return Date.now() - start > 100;
    };
    
    if (_0x1234()) {
      this.detectDevTools('obfuscated-check');
    }
  }
  
  // Инициализация защиты
  public init(): void {
    // Защита от переопределения наших методов
    this.protectMethods();
    
    // Пропускаем защиту на мобильных устройствах
    if (this.isMobileDevice()) {
      console.log('Mobile device detected, skipping DevTools protection');
      return;
    }
    
    // НЕМЕДЛЕННАЯ проверка при загрузке
    this.immediateCheck();
    
    // Дополнительная проверка на эмуляцию после небольшой задержки
    setTimeout(() => {
      if (this.detectEmulation()) {
        this.detectDevTools('emulation-detected');
      }
    }, 1000);
    
    // Запускаем все методы детекции
    this.startDebuggerWorker();
    this.startPerformanceDetection();
    this.startSizeDetection();
    this.startElementIdDetection();
    this.overrideConsoleMethods();
    this.startTimingDetection();
    
    // Запускаем обфусцированные проверки
    setInterval(() => {
      this.obfuscatedCheck();
    }, 500);
    
    // Основной цикл проверки - продолжает работать даже после "продолжить"
    this.checkInterval = setInterval(() => {
      // Проверяем, не были ли обойдены наши блокировки
      if (this.state.frozen && document.body) {
        // Если DOM восстановился после заморозки - замораживаем снова
        this.freezeApplication();
      }
      
      if (this.state.isOpen && !this.state.frozen) {
        this.freezeApplication();
      }
    }, 100);
    
    // Дополнительная проверка каждые 2 секунды
    setInterval(() => {
      if (this.state.isOpen || this.state.frozen) {
        // Перепроверяем и усиливаем блокировку
        this.freezeApplication();
      }
    }, 2000);
  }
  
  // Немедленная проверка при инициализации
  private immediateCheck(): void {
    // Проверка размера окна (DevTools может быть уже открыт)
    const threshold = 160;
    if (window.outerWidth - window.innerWidth > threshold || 
        window.outerHeight - window.innerHeight > threshold) {
      this.detectDevTools('immediate-size-check');
      return;
    }
    
    // Быстрая проверка через debugger
    const startTime = performance.now();
    debugger;
    const duration = performance.now() - startTime;
    
    if (duration > 100) {
      this.detectDevTools('immediate-debugger-check');
    }
  }
  
  // Защита методов от переопределения
  private protectMethods(): void {
    // Защищаем методы от переопределения
    const methods = [
      'init', 'detectDevTools', 'freezeApplication',
      'isMobileDevice', 'detectEmulation'
    ];
    
    methods.forEach(method => {
      const descriptor = Object.getOwnPropertyDescriptor(this, method) ||
                        Object.getOwnPropertyDescriptor(Object.getPrototypeOf(this), method);
      
      if (descriptor) {
        Object.defineProperty(this, method, {
          ...descriptor,
          configurable: false,
          writable: false
        });
      }
    });
    
    // Защищаем state от замены, но позволяем изменять его свойства
    Object.defineProperty(this, 'state', {
      configurable: false,
      enumerable: false,
      writable: false,
      value: this.state
    });
    
    // Защищаем сам объект от добавления новых свойств
    Object.seal(this);
  }
  
  // Усиленная проверка на мобильное устройство (защита от имитации)
  private isMobileDevice(): boolean {
    const win = window as TelegramWindow;
    
    // 1. Проверяем Telegram WebApp платформу (самая надежная для нашего случая)
    const telegramPlatform = win.Telegram?.WebApp?.platform;
    const isTelegramMobile = telegramPlatform === 'android' || 
                            telegramPlatform === 'ios' ||
                            telegramPlatform === 'android_x' ||
                            telegramPlatform === 'ios_x';
    
    // Если это Telegram, доверяем только его определению платформы
    if (win.Telegram?.WebApp) {
      return isTelegramMobile;
    }
    
    // Для non-Telegram проверяем множественные факторы
    let mobileScore = 0;
    const requiredScore = 3; // Минимум 3 из проверок должны пройти
    
    // 2. User Agent проверка
    const userAgent = navigator.userAgent.toLowerCase();
    const mobileKeywords = ['android', 'iphone', 'ipad', 'ipod', 'mobile', 'tablet'];
    if (mobileKeywords.some(keyword => userAgent.includes(keyword))) {
      mobileScore++;
    }
    
    // 3. Touch события и точки касания
    if ('ontouchstart' in window && navigator.maxTouchPoints > 0) {
      mobileScore++;
    }
    
    // 4. Ориентация устройства
    if (window.orientation !== undefined || window.DeviceOrientationEvent) {
      mobileScore++;
    }
    
    // 5. Размер экрана и соотношение пикселей
    const isMobileScreen = window.innerWidth <= 768 && window.devicePixelRatio > 1;
    if (isMobileScreen) {
      mobileScore++;
    }
    
    // 6. Проверка специфичных мобильных API
    try {
      const nav = navigator as DeviceMemoryNavigator;
      
      // Battery API (часто недоступен на десктопе)
      if ('getBattery' in nav) {
        mobileScore += 0.5;
      }
      
      // Проверка вибрации (мобильная функция)
      if ('vibrate' in navigator) {
        mobileScore += 0.5;
      }
    } catch (e) {
      // Игнорируем ошибки
    }
    
    // 7. Проверка производительности памяти (мобильные устройства имеют меньше памяти)
    const nav = navigator as DeviceMemoryNavigator;
    if (nav.deviceMemory && nav.deviceMemory <= 4) {
      mobileScore++;
    }
    
    // 8. Проверка на отсутствие расширений (они не работают на мобильных браузерах)
    if (!win.chrome?.runtime) {
      mobileScore += 0.5;
    }
    
    // 9. Проверка pointer события
    const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
    const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
    if (hasCoarsePointer && !hasFinePointer) {
      mobileScore++;
    }
    
    return mobileScore >= requiredScore;
  }
  
  // Обнаружение эмуляции устройства через DevTools
  private detectEmulation(): boolean {
    // Проверяем несоответствия при эмуляции
    const checks: boolean[] = [];
    
    // 1. Проверка несоответствия touch и pointer событий
    const hasTouch = 'ontouchstart' in window;
    const hasPointer = window.matchMedia('(pointer: coarse)').matches;
    const hasMouse = window.matchMedia('(hover: hover)').matches;
    
    // При эмуляции часто есть и touch и mouse одновременно
    if (hasTouch && hasMouse) {
      checks.push(true);
    }
    
    // 2. Проверка navigator.platform vs userAgent
    const platform = navigator.platform.toLowerCase();
    const userAgent = navigator.userAgent.toLowerCase();
    
    // Несоответствие платформы и user agent
    if ((platform.includes('win') || platform.includes('mac') || platform.includes('linux')) &&
        (userAgent.includes('android') || userAgent.includes('iphone'))) {
      checks.push(true);
    }
    
    // 3. Проверка размера экрана vs сообщаемого устройства
    if (window.screen.width > 768 && userAgent.includes('mobile')) {
      checks.push(true);
    }
    
    // 4. Проверка отсутствия мобильных API при мобильном userAgent
    if (userAgent.includes('mobile') && !('orientation' in window)) {
      checks.push(true);
    }
    
    // 5. Проверка WebGL рендерера (часто выдает десктопную видеокарту)
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl && gl instanceof WebGLRenderingContext) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          // Проверяем на десктопные GPU при мобильном UA
          if (userAgent.includes('mobile') && 
              (renderer.includes('NVIDIA') || renderer.includes('AMD') || renderer.includes('Intel'))) {
            checks.push(true);
          }
        }
      }
    } catch (e) {
      // Игнорируем ошибки
    }
    
    // Если хотя бы 2 проверки показывают эмуляцию
    return checks.filter(Boolean).length >= 2;
  }
  
  // Метод 5: Timing-based detection
  private startTimingDetection(): void {
    let baseline: number | null = null;
    
    const measure = () => {
      const start = performance.now();
      for (let i = 0; i < 50; i++) {
        console.log(new Date());
        console.clear();
      }
      const duration = performance.now() - start;
      
      if (baseline === null) {
        baseline = duration;
      } else if (duration > baseline * 10) {
        this.detectDevTools('timing-anomaly');
      }
    };
    
    // Устанавливаем базовое время
    measure();
    
    // Периодически проверяем
    setInterval(measure, 2000);
  }
  
  // Метод 1: Worker с debugger statement
  private startDebuggerWorker(): void {
    try {
      const workerCode = `
        let startTime;
        const checkDebugger = () => {
          startTime = performance.now();
          debugger;
          const duration = performance.now() - startTime;
          postMessage({ duration });
        };
        setInterval(checkDebugger, 1000);
      `;
      
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      this.worker = new Worker(URL.createObjectURL(blob));
      
      this.worker.onmessage = (e) => {
        if (e.data.duration > 100) {
          this.detectDevTools('worker-debugger');
        }
      };
    } catch (error) {
      // Worker не поддерживается или заблокирован
    }
  }
  
  // Метод 2: Performance detection через console.log
  private startPerformanceDetection(): void {
    const element = document.createElement('div');
    Object.defineProperty(element, 'id', {
      get: () => {
        this.detectDevTools('element-id-getter');
        return 'test';
      }
    });
    
    setInterval(() => {
      const startTime = performance.now();
      console.log(element);
      console.clear();
      const duration = performance.now() - startTime;
      
      if (duration > 10) {
        this.detectDevTools('console-performance');
      }
    }, 1000);
  }
  
  // Метод 3: Детекция изменения размера окна
  private startSizeDetection(): void {
    let threshold = 160;
    let widthThreshold = window.outerWidth - window.innerWidth > threshold;
    let heightThreshold = window.outerHeight - window.innerHeight > threshold;
    
    const check = () => {
      if (window.outerWidth - window.innerWidth > threshold || 
          window.outerHeight - window.innerHeight > threshold) {
        if (!widthThreshold || !heightThreshold) {
          this.detectDevTools('window-size');
        }
      } else {
        widthThreshold = false;
        heightThreshold = false;
      }
    };
    
    setInterval(check, 500);
    window.addEventListener('resize', check);
  }
  
  // Метод 4: Element ID getter detection
  private startElementIdDetection(): void {
    const div = document.createElement('div');
    let detected = false;
    
    Object.defineProperty(div, 'id', {
      get: function() {
        detected = true;
        return 'detector';
      },
      configurable: true
    });
    
    setInterval(() => {
      detected = false;
      console.log('%c', div);
      console.clear();
      
      if (detected) {
        this.detectDevTools('element-id');
      }
    }, 1000);
  }
  
  // Переопределение методов консоли
  private overrideConsoleMethods(): void {
    const methods = ['log', 'warn', 'error', 'info', 'debug'];
    
    methods.forEach(method => {
      this.originalFunctions.set(method, console[method as keyof Console]);
      
      Object.defineProperty(console, method, {
        get: () => {
          this.detectDevTools('console-getter');
          return this.originalFunctions.get(method);
        },
        set: () => {
          this.detectDevTools('console-setter');
        }
      });
    });
  }
  
  // Обнаружение DevTools
  private detectDevTools(method: string): void {
    // Используем защищенное изменение state
    if (!this.state.detectionMethods.has(method)) {
      this.state.detectionMethods.add(method);
    }
    
    if (!this.state.isOpen) {
      this.state.isOpen = true;
      
      // Немедленная заморозка при обнаружении
      if (!this.state.frozen) {
        this.freezeApplication();
      }
    } else if (this.state.frozen) {
      // Если уже заморожено, но обнаружение продолжается - усиливаем блокировку
      // Это значит, что пользователь пытается обойти защиту
      this.enforceFreeze();
    }
  }
  
  // Усиление блокировки при попытках обхода
  private enforceFreeze(): void {
    // Немедленная перезагрузка страницы
    try {
      window.location.href = 'about:blank';
      window.location.reload();
    } catch (e) {}
    
    // Полная очистка страницы
    try {
      document.open();
      document.write('<html><body style="background:black;color:red;font-size:50px;text-align:center;padding-top:200px;">ACCESS DENIED</body></html>');
      document.close();
    } catch (e) {}
    
    // Останавливаем выполнение через исключение
    throw new Error('DEVTOOLS_DETECTED_CRITICAL_SHUTDOWN');
  }
  
  // Заморозка приложения
  private freezeApplication(): void {
    // Проверяем, не пытается ли кто-то обойти заморозку
    if (this.state.frozen) {
      // Если уже заморожено, но вызывается снова - усиливаем
      this.enforceFreeze();
      return;
    }
    
    this.state.frozen = true;
    
    // КРИТИЧНО: Сохраняем оригинальные функции до их поломки
    const originalLocation = window.location.href;
    
    // 1. Немедленно очищаем весь DOM
    document.documentElement.innerHTML = '';
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    
    // 2. Создаем черный экран с сообщением
    const blocker = document.createElement('div');
    blocker.id = 'devtools-blocker';
    blocker.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: black !important;
      color: red !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-size: 30px !important;
      z-index: 2147483647 !important;
      pointer-events: all !important;
      user-select: none !important;
    `;
    blocker.innerHTML = 'SECURITY VIOLATION DETECTED';
    document.documentElement.appendChild(blocker);
    
    // 3. Защищаем блокер от удаления
    const protectBlocker = () => {
      if (!document.getElementById('devtools-blocker')) {
        document.documentElement.innerHTML = '';
        document.documentElement.appendChild(blocker.cloneNode(true));
      }
    };
    setInterval(protectBlocker, 10);
    
    // 4. Удаляем все скрипты
    document.querySelectorAll('script').forEach(script => script.remove());
    
    // 5. Блокируем React рендеринг
    try {
      const root = document.getElementById('root') || document.getElementById('__next');
      if (root) root.remove();
      
      // Ломаем React и другие фреймворки
      (window as any).React = undefined;
      (window as any).ReactDOM = undefined;
      (window as any).Vue = undefined;
      (window as any).Angular = undefined;
    } catch (e) {}
    
    // 6. Перезаписываем критические функции с постоянной проверкой
    const criticalError = () => {
      throw new Error('CRITICAL_SECURITY_VIOLATION');
    };
    
    // Функция для постоянной поломки
    const breakFunction = (obj: any, method: string) => {
      Object.defineProperty(obj, method, {
        get: () => criticalError,
        set: () => criticalError,
        configurable: false
      });
    };
    
    // Ломаем все основные API
    ['setTimeout', 'setInterval', 'requestAnimationFrame', 'fetch'].forEach(fn => {
      breakFunction(window, fn);
    });
    
    // Ломаем Promise
    breakFunction(Promise.prototype, 'then');
    breakFunction(Promise.prototype, 'catch');
    breakFunction(Promise.prototype, 'finally');
    breakFunction(Promise, 'resolve');
    breakFunction(Promise, 'reject');
    breakFunction(Promise, 'all');
    breakFunction(Promise, 'race');
    
    // 7. Ломаем XMLHttpRequest
    window.XMLHttpRequest = class {
      constructor() {
        throw new Error('XMLHttpRequest blocked');
      }
    } as any;
    
    // 8. Ломаем консоль с защитой от восстановления
    const consoleBreak = () => { 
      debugger;
      throw new Error('Console permanently disabled');
    };
    
    const consoleProps = ['log', 'error', 'warn', 'info', 'debug', 'dir', 'table'];
    consoleProps.forEach(prop => {
      Object.defineProperty(console, prop, {
        get: () => consoleBreak,
        set: () => consoleBreak,
        configurable: false
      });
    });
    
    // 9. Блокируем ВСЕ события навсегда
    const blockAllEvents = (e: Event) => {
      e.stopImmediatePropagation();
      e.preventDefault();
      e.stopPropagation();
      return false;
    };
    
    // Блокируем существующие и будущие события
    const eventTypes = [
      'click', 'dblclick', 'mousedown', 'mouseup', 'mousemove', 'mouseenter', 'mouseleave',
      'touchstart', 'touchend', 'touchmove', 'touchcancel',
      'keydown', 'keyup', 'keypress', 'input', 'change', 'submit',
      'focus', 'blur', 'focusin', 'focusout',
      'scroll', 'wheel', 'contextmenu', 'drag', 'drop'
    ];
    
    eventTypes.forEach(event => {
      // Capture phase
      document.addEventListener(event, blockAllEvents, true);
      window.addEventListener(event, blockAllEvents, true);
      document.documentElement.addEventListener(event, blockAllEvents, true);
      
      // Bubble phase  
      document.addEventListener(event, blockAllEvents, false);
      window.addEventListener(event, blockAllEvents, false);
      document.documentElement.addEventListener(event, blockAllEvents, false);
    });
    
    // 10. Переопределяем addEventListener чтобы блокировать новые обработчики
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function() {
      return; // Просто ничего не делаем
    };
    
    // 11. Запускаем множественные блокирующие механизмы
    this.createMultipleBlockingLoops();
    
    // 12. Постоянная перезагрузка страницы
    const reloadLoop = () => {
      try {
        // Сначала пытаемся перейти на пустую страницу
        window.location.href = 'about:blank';
      } catch (e) {
        try {
          // Если не удалось - перезагружаем
          window.location.reload();
        } catch (e2) {
          // Если и это не удалось - заменяем location
          window.location.replace(originalLocation);
        }
      }
      
      // Повторяем каждые 50ms
      originalAddEventListener.call(window, 'load', reloadLoop);
      (window as any).setTimeout = window.setTimeout || (() => {});
      try {
        (window.setTimeout as any)(reloadLoop, 50);
      } catch (e) {}
    };
    
    // Запускаем перезагрузку через 500ms
    try {
      originalAddEventListener.call(window, 'load', () => {
        (window as any).setTimeout = window.setTimeout || (() => {});
        (window.setTimeout as any)(reloadLoop, 500);
      });
    } catch (e) {}
    
    // 13. Крайняя мера - исчерпание ресурсов
    this.exhaustMemory();
  }
  
  // Создаем множественные блокирующие циклы
  private createMultipleBlockingLoops(): void {
    // 1. Debugger loop (могут обойти, но замедлит)
    const debuggerLoop = () => {
      debugger;
      setTimeout(debuggerLoop, 0);
    };
    
    // 2. Бесконечный цикл в Worker (не блокирует UI, но нагружает CPU)
    try {
      const workerCode = `
        while(true) {
          // Бесконечный цикл в worker
          Math.random() * Math.random();
        }
      `;
      new Worker(URL.createObjectURL(new Blob([workerCode])));
    } catch (e) {}
    
    // 3. Stack overflow через рекурсию
    const stackOverflow = () => {
      try {
        stackOverflow();
      } catch (e) {
        setTimeout(stackOverflow, 0);
      }
    };
    
    // 4. DOM flooding
    const domFlood = () => {
      try {
        for (let i = 0; i < 1000; i++) {
          const div = document.createElement('div');
          div.style.position = 'fixed';
          div.style.top = '0';
          div.style.left = '0';
          div.style.width = '100%';
          div.style.height = '100%';
          div.style.zIndex = '999999';
          div.style.backgroundColor = 'black';
          div.innerHTML = 'ACCESS DENIED';
          document.body.appendChild(div);
        }
      } catch (e) {}
      setTimeout(domFlood, 10);
    };
    
    // Запускаем все циклы
    debuggerLoop();
    setTimeout(stackOverflow, 50);
    setTimeout(domFlood, 100);
  }
  
  // Исчерпание памяти (крайняя мера)
  private exhaustMemory(): void {
    const arrays: any[] = [];
    const exhaust = () => {
      try {
        while (true) {
          arrays.push(new Array(10000000).fill('DEVTOOLS_DETECTED'));
        }
      } catch (e) {
        // Out of memory - миссия выполнена
      }
    };
    
    // Запускаем в нескольких таймерах
    for (let i = 0; i < 10; i++) {
      setTimeout(exhaust, i * 100);
    }
  }
  
  // Очистка при необходимости
  public destroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    if (this.worker) {
      this.worker.terminate();
    }
  }
}

// Экспортируем singleton
export const devToolsProtection = new DevToolsProtection();