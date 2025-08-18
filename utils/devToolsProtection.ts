// src/utils/devToolsProtection.ts
// DevTools detection and blocking system for 2024-2025
// Based on latest detection methods and anti-debugging techniques

interface DevToolsDetector {
  isOpen: boolean;
  orientation: "vertical" | "horizontal" | null;
  lastDetectionTime: number;
}

export class DevToolsProtection {
  private static instance: DevToolsProtection;
  private isDetected: boolean = false;
  private callbacks: Set<(isOpen: boolean) => void> = new Set();
  private checkInterval: NodeJS.Timeout | null = null;
  private debuggerInterval: NodeJS.Timeout | null = null;

  // Detection thresholds
  private readonly THRESHOLD = 160;
  private readonly EMULATION_THRESHOLD = 20;

  // Check interval in milliseconds (configurable)
  private readonly CHECK_INTERVAL = 2000; // Change this value to adjust detection frequency

  static getInstance(): DevToolsProtection {
    if (!DevToolsProtection.instance) {
      DevToolsProtection.instance = new DevToolsProtection();
    }

    return DevToolsProtection.instance;
  }

  /**
   * Method 1: Size-based detection
   * Detects when DevTools is docked by comparing window dimensions
   */
  private checkWindowSize(): boolean {
    if (typeof window === "undefined") return false;

    const widthThreshold =
      window.outerWidth - window.innerWidth > this.THRESHOLD;
    const heightThreshold =
      window.outerHeight - window.innerHeight > this.THRESHOLD;

    // Additional check for undocked DevTools
    const suspiciousRatio =
      window.outerWidth < 800 ||
      window.outerHeight < 600 ||
      window.screen.width / window.innerWidth > 1.4 ||
      window.screen.height / window.innerHeight > 1.4;

    return widthThreshold || heightThreshold || suspiciousRatio;
  }

  /**
   * Method 2: Performance-based detection
   * Measures console.log performance degradation when DevTools is open
   */
  private checkConsolePerformance(): boolean {
    if (typeof console === "undefined") return false;

    const start = performance.now();
    const testObj = { type: "devtools-check" };

    // Console operations are slower when DevTools is open
    for (let i = 0; i < 50; i++) {
      console.log(testObj);
      console.clear();
    }

    const end = performance.now();
    const executionTime = end - start;

    // DevTools typically causes >10ms delay for this operation
    return executionTime > 10;
  }

  /**
   * Method 3: toString() override detection
   * Modern browsers call toString() on logged objects when DevTools is open
   */
  private checkToStringOverride(): boolean {
    let detected = false;

    const element = new Image();

    Object.defineProperty(element, "id", {
      get: function () {
        detected = true;

        return "devtools-detection";
      },
    });

    // This will trigger the getter if DevTools is open
    console.log("%c", element);
    console.clear();

    return detected;
  }

  /**
   * Method 4: Debugger timing detection
   * Detects if debugger is paused or stepping through
   */
  private checkDebuggerTiming(): boolean {
    const start = performance.now();

    debugger; // Will pause if DevTools is open with breakpoints enabled
    const end = performance.now();

    // If paused, there will be a significant delay
    return end - start > 100;
  }

  /**
   * Method 5: Function constructor detection
   * Some DevTools modify Function.prototype.constructor
   */
  private checkFunctionConstructor(): boolean {
    try {
      const func = new Function("return 1");
      const result = func();

      // Check if function was tampered with
      if (result !== 1) return true;

      // Check constructor chain
      if (Function.prototype.constructor !== Function) return true;

      return false;
    } catch {
      // Error might indicate tampering
      return true;
    }
  }

  /**
   * Method 6: Chrome/Firefox specific detection
   * Uses browser-specific properties that change when DevTools is open
   */
  private checkBrowserSpecific(): boolean {
    // Chrome specific
    if ("chrome" in window && "runtime" in (window as any).chrome) {
      try {
        // Chrome DevTools detection via runtime
        const isChrome = !!(window as any).chrome.runtime?.id;

        if (!isChrome) return true;
      } catch {
        return true;
      }
    }

    // Firefox specific - Firebug detection
    if ("console" in window && "firebug" in console) {
      return true;
    }

    // Check for common DevTools global variables
    const suspiciousGlobals = [
      "__REACT_DEVTOOLS_GLOBAL_HOOK__",
      "__VUE_DEVTOOLS_GLOBAL_HOOK__",
    ];

    for (const global of suspiciousGlobals) {
      if (global in window) {
        // These are legitimate in dev, but check if they're being actively used
        const hook = (window as any)[global];

        if (hook && typeof hook === "object" && hook.isDisabled === false) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Combined detection using multiple methods
   */
  private detectDevTools(): boolean {
    // Use multiple detection methods for accuracy
    const detectionMethods = [
      () => this.checkWindowSize(),
      () => this.checkToStringOverride(),
      () => this.checkConsolePerformance(),
      () => this.checkBrowserSpecific(),
      // Debugger timing is more aggressive, use sparingly
      // () => this.checkDebuggerTiming(),
    ];

    // If any two methods detect DevTools, consider it open
    let detectionCount = 0;

    for (const method of detectionMethods) {
      try {
        if (method()) {
          detectionCount++;
          if (detectionCount >= 2) {
            return true;
          }
        }
      } catch (e) {
        // Ignore errors in detection methods silently
      }
    }

    // Single detection from window size is often reliable enough
    if (detectionCount === 1 && this.checkWindowSize()) {
      return true;
    }

    return false;
  }

  /**
   * Start continuous debugger blocking
   * This will pause execution when DevTools is detected
   */
  private startDebuggerLoop(): void {
    if (this.debuggerInterval) return;

    this.debuggerInterval = setInterval(() => {
      if (this.isDetected) {
        // Continuously trigger debugger to block DevTools usage
        debugger;

        // Additional blocking mechanisms
        this.blockExecution();
      }
    }, 100); // Fast interval for immediate blocking
  }

  /**
   * Block execution and functionality
   */
  private blockExecution(): void {
    // Override console methods
    const noop = () => {};

    console.log = noop;
    console.warn = noop;
    console.error = noop;
    console.info = noop;
    console.debug = noop;
    console.trace = noop;
    console.table = noop;
    console.group = noop;
    console.groupEnd = noop;
    console.time = noop;
    console.timeEnd = noop;

    // Continuously pause with debugger
    debugger;

    // Create infinite loop of debugger statements
    setTimeout(() => {
      debugger;
      this.blockExecution(); // Recursive blocking
    }, 0);
  }

  /**
   * Start DevTools detection
   */
  start(callback?: (isOpen: boolean) => void): void {
    if (callback) {
      this.callbacks.add(callback);
    }

    // Clear any existing interval
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    // Initial check
    this.check();

    // Set up periodic checking
    this.checkInterval = setInterval(() => {
      this.check();
    }, this.CHECK_INTERVAL);

    // Listen for specific keyboard shortcuts
    this.setupKeyboardListeners();

    // Listen for visibility changes
    this.setupVisibilityListeners();
  }

  /**
   * Manual check for DevTools
   */
  check(): void {
    const wasDetected = this.isDetected;

    this.isDetected = this.detectDevTools();

    if (this.isDetected && !wasDetected) {
      this.onDevToolsOpen();
    } else if (!this.isDetected && wasDetected) {
      this.onDevToolsClose();
    }
  }

  /**
   * Handle DevTools opening
   */
  private onDevToolsOpen(): void {
    // Notify all callbacks
    this.callbacks.forEach((callback) => callback(true));

    // Start debugger blocking loop
    this.startDebuggerLoop();

    // Additional security measures
    this.disableContextMenu();
    this.disableTextSelection();
    this.disableKeyboardShortcuts();
  }

  /**
   * Handle DevTools closing
   */
  private onDevToolsClose(): void {
    // Notify all callbacks
    this.callbacks.forEach((callback) => callback(false));

    // Stop debugger loop
    if (this.debuggerInterval) {
      clearInterval(this.debuggerInterval);
      this.debuggerInterval = null;
    }
  }

  /**
   * Setup keyboard shortcut detection
   */
  private setupKeyboardListeners(): void {
    document.addEventListener(
      "keydown",
      (e) => {
        // F12
        if (e.key === "F12") {
          e.preventDefault();
          e.stopPropagation();
          this.isDetected = true;
          this.onDevToolsOpen();

          return false;
        }

        // Ctrl+Shift+I / Cmd+Option+I
        if (
          (e.ctrlKey || e.metaKey) &&
          e.shiftKey &&
          (e.key === "I" || e.key === "i")
        ) {
          e.preventDefault();
          e.stopPropagation();
          this.isDetected = true;
          this.onDevToolsOpen();

          return false;
        }

        // Ctrl+Shift+J / Cmd+Option+J (Console)
        if (
          (e.ctrlKey || e.metaKey) &&
          e.shiftKey &&
          (e.key === "J" || e.key === "j")
        ) {
          e.preventDefault();
          e.stopPropagation();
          this.isDetected = true;
          this.onDevToolsOpen();

          return false;
        }

        // Ctrl+Shift+C / Cmd+Option+C (Inspect Element)
        if (
          (e.ctrlKey || e.metaKey) &&
          e.shiftKey &&
          (e.key === "C" || e.key === "c")
        ) {
          e.preventDefault();
          e.stopPropagation();
          this.isDetected = true;
          this.onDevToolsOpen();

          return false;
        }

        // Ctrl+U / Cmd+U (View Source)
        if ((e.ctrlKey || e.metaKey) && (e.key === "U" || e.key === "u")) {
          e.preventDefault();
          e.stopPropagation();

          return false;
        }
      },
      true,
    );
  }

  /**
   * Setup visibility change listeners
   */
  private setupVisibilityListeners(): void {
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        // Page is hidden, might be DevTools focus
        setTimeout(() => this.check(), 500);
      }
    });

    window.addEventListener("blur", () => {
      // Window lost focus, check for DevTools
      setTimeout(() => this.check(), 500);
    });

    window.addEventListener("resize", () => {
      // Window resized, might be DevTools docking
      setTimeout(() => this.check(), 500);
    });
  }

  /**
   * Disable right-click context menu
   */
  private disableContextMenu(): void {
    document.addEventListener(
      "contextmenu",
      (e) => {
        e.preventDefault();

        return false;
      },
      true,
    );
  }

  /**
   * Disable text selection
   */
  private disableTextSelection(): void {
    document.body.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none";
    // @ts-ignore
    document.body.style.msUserSelect = "none";
    // @ts-ignore
    document.body.style.mozUserSelect = "none";
  }

  /**
   * Disable keyboard shortcuts
   */
  private disableKeyboardShortcuts(): void {
    document.addEventListener(
      "keydown",
      (e) => {
        // Block all Ctrl/Cmd combinations when DevTools is detected
        if (this.isDetected && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          e.stopPropagation();

          return false;
        }
      },
      true,
    );
  }

  /**
   * Stop DevTools detection
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    if (this.debuggerInterval) {
      clearInterval(this.debuggerInterval);
      this.debuggerInterval = null;
    }

    this.callbacks.clear();
    this.isDetected = false;
  }

  /**
   * Get current detection status
   */
  getStatus(): boolean {
    return this.isDetected;
  }

  /**
   * Add callback for DevTools state changes
   */
  onStateChange(callback: (isOpen: boolean) => void): () => void {
    this.callbacks.add(callback);

    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback);
    };
  }
}

// Export singleton instance
export const devToolsProtection = DevToolsProtection.getInstance();
