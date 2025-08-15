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

        // Основной цикл проверки
        this.checkInterval = setInterval(() => {
            if (this.state.isOpen && !this.state.frozen) {
                this.freezeApplication();
            }
        }, 100);
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
            get: function () {
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
        }
    }

    // Заморозка приложения
    private freezeApplication(): void {
        if (this.state.frozen) return;

        this.state.frozen = true;

        // Останавливаем все таймеры
        const highestId = Number(setTimeout(() => { }, 0));
        for (let i = 0; i < highestId; i++) {
            clearTimeout(i);
            clearInterval(i);
        }

        // Блокируем все события
        const blockEvent = (e: Event) => {
            e.stopPropagation();
            e.preventDefault();
            return false;
        };

        // Список всех событий для блокировки
        const events = [
            'click', 'dblclick', 'mousedown', 'mouseup', 'mousemove',
            'touchstart', 'touchend', 'touchmove', 'touchcancel',
            'keydown', 'keyup', 'keypress',
            'contextmenu', 'wheel', 'scroll'
        ];

        events.forEach(event => {
            document.addEventListener(event, blockEvent, true);
            window.addEventListener(event, blockEvent, true);
        });

        // Блокируем fetch и XMLHttpRequest
        window.fetch = () => Promise.reject(new Error('Application frozen'));
        window.XMLHttpRequest = function () {
            throw new Error('Application frozen');
        } as any;

        // Блокируем requestAnimationFrame
        window.requestAnimationFrame = () => 0;

        // Очищаем содержимое страницы
        document.body.style.display = 'none';

        // Бесконечный цикл для полной блокировки
        this.createBlockingLoop();
    }

    // Создаем блокирующий цикл
    private createBlockingLoop(): void {
        // Используем несколько методов блокировки

        // 1. Debugger loop
        const debuggerLoop = () => {
            debugger;
            setTimeout(debuggerLoop, 0);
        };

        // 2. Infinite constructor loop  
        const constructorLoop = () => {
            try {
                (function () { }).constructor("debugger")();
            } catch (e) { }
            setTimeout(constructorLoop, 50);
        };

        // 3. Memory exhaustion (осторожно)
        const memoryLoop = () => {
            const arr: any[] = [];
            try {
                while (true) {
                    arr.push(new Array(1000000));
                }
            } catch (e) {
                // Out of memory
            }
        };

        // Запускаем блокировки
        debuggerLoop();
        constructorLoop();

        // Память исчерпываем только в крайнем случае
        setTimeout(memoryLoop, 5000);
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