// src/hooks/usePCDetection.ts - Complete mouse/PC detection utility

"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface DetectionConfig {
  enabled: boolean;
  sensitivityThreshold: number; // Number of mouse events before triggering
  detectionTimeWindow: number; // Time window in ms for detection
  excludePointerEvents: boolean; // Whether to exclude pointer events that might be touch
}

interface DeviceInfo {
  hasTouch: boolean;
  maxTouchPoints: number;
  isMobile: boolean;
  userAgent: string;
  screenWidth: number;
  screenHeight: number;
}

interface DetectionMetrics {
  mouseMovements: number;
  mouseClicks: number;
  detectionDurationMs: number;
  firstDetectedEvent: string;
  lastDetectedEvent: string;
}

interface PCDetectionHookReturn {
  isDetectionActive: boolean;
  deviceInfo: DeviceInfo;
  triggerManualDetection: () => void;
}

export function usePCDetection(
  makeAuthenticatedRequest: (endpoint: string, options?: RequestInit) => Promise<Response>,
  config: DetectionConfig = {
    enabled: true,
    sensitivityThreshold: 3,
    detectionTimeWindow: 5000,
    excludePointerEvents: true,
  }
): PCDetectionHookReturn {
  const router = useRouter();
  const mouseEventsRef = useRef<string[]>([]);
  const detectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isDetectionActiveRef = useRef<boolean>(false);
  const hasTriggeredRef = useRef<boolean>(false);
  const detectionMetricsRef = useRef<DetectionMetrics>({
    mouseMovements: 0,
    mouseClicks: 0,
    detectionDurationMs: 0,
    firstDetectedEvent: '',
    lastDetectedEvent: '',
  });
  const detectionStartTimeRef = useRef<number>(0);

  // Get comprehensive device information
  const getDeviceInfo = useCallback((): DeviceInfo => {
    if (typeof window === "undefined") {
      return {
        hasTouch: false,
        maxTouchPoints: 0,
        isMobile: false,
        userAgent: "",
        screenWidth: 0,
        screenHeight: 0,
      };
    }

    const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const maxTouchPoints = navigator.maxTouchPoints || 0;
    const userAgent = navigator.userAgent;
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    
    // Enhanced mobile detection
    const mobileUserAgents = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    const isMobileUA = mobileUserAgents.test(userAgent);
    const isMobile = hasTouch && (maxTouchPoints > 0 || isMobileUA);

    return {
      hasTouch,
      maxTouchPoints,
      isMobile,
      userAgent,
      screenWidth,
      screenHeight,
    };
  }, []);

  const deviceInfo = getDeviceInfo();

  // Block user directly using existing Nebula API
  const blockUserForPCDetection = useCallback(async () => {
    if (hasTriggeredRef.current) {
      return; // Prevent multiple blocks
    }

    hasTriggeredRef.current = true;

    try {
      const detectionData = {
        userAgent: navigator.userAgent,
        mouseEvents: [...mouseEventsRef.current],
        timestamp: new Date().toISOString(),
        pageUrl: window.location.href,
        deviceInfo: {
          hasTouch: deviceInfo.hasTouch,
          maxTouchPoints: deviceInfo.maxTouchPoints,
          screenWidth: deviceInfo.screenWidth,
          screenHeight: deviceInfo.screenHeight,
          isMobile: deviceInfo.isMobile,
        },
        detectionMetrics: {
          ...detectionMetricsRef.current,
          detectionDurationMs: Date.now() - detectionStartTimeRef.current,
        },
      };

      console.warn("🖱️ PC/Mouse detected! Blocking user...", detectionData);

      // Use existing Nebula manual block endpoint to create a PC detection block
      // We'll create a manual block with PC detection data in additional_data
      const response = await makeAuthenticatedRequest("/api/nebula/manual-block", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          blockReason: "pc_detected",
          durationHours: 48, // 2 days
          additionalData: {
            source: "client_pc_detection",
            detectionData,
            automatedBlock: true,
            detectedAt: new Date().toISOString(),
          },
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("PC detection block successful:", result);
        
        // Immediate redirect to blocked page
        router.push("/blocked");
      } else {
        console.error("Failed to block user for PC detection:", response.status);
        // Fallback: still redirect to show blocked page
        router.push("/blocked");
      }
    } catch (error) {
      console.error("Error blocking user for PC detection:", error);
      // Fallback: still redirect to show blocked page
      router.push("/blocked");
    }
  }, [makeAuthenticatedRequest, deviceInfo, router]);

  // Reset detection state
  const resetDetection = useCallback(() => {
    mouseEventsRef.current = [];
    detectionMetricsRef.current = {
      mouseMovements: 0,
      mouseClicks: 0,
      detectionDurationMs: 0,
      firstDetectedEvent: '',
      lastDetectedEvent: '',
    };
    if (detectionTimeoutRef.current) {
      clearTimeout(detectionTimeoutRef.current);
      detectionTimeoutRef.current = null;
    }
  }, []);

  // Add mouse event to tracking
  const addMouseEvent = useCallback((eventType: string, event?: MouseEvent) => {
    if (!config.enabled || hasTriggeredRef.current) {
      return;
    }

    const eventString = `${eventType}:${Date.now()}`;
    mouseEventsRef.current.push(eventString);

    // Update metrics
    if (eventType === 'mousemove') {
      detectionMetricsRef.current.mouseMovements++;
    } else if (eventType === 'mousedown' || eventType === 'click') {
      detectionMetricsRef.current.mouseClicks++;
    }

    if (!detectionMetricsRef.current.firstDetectedEvent) {
      detectionMetricsRef.current.firstDetectedEvent = eventString;
      detectionStartTimeRef.current = Date.now();
    }
    detectionMetricsRef.current.lastDetectedEvent = eventString;

    console.log(`🖱️ Mouse event detected: ${eventType}`, {
      totalEvents: mouseEventsRef.current.length,
      movements: detectionMetricsRef.current.mouseMovements,
      clicks: detectionMetricsRef.current.mouseClicks,
    });

    // Check if we've reached threshold
    if (mouseEventsRef.current.length >= config.sensitivityThreshold) {
      console.warn(`🚨 PC Detection threshold reached! Events: ${mouseEventsRef.current.length}`);
      blockUserForPCDetection();
      return;
    }

    // Set timeout to reset detection window
    if (detectionTimeoutRef.current) {
      clearTimeout(detectionTimeoutRef.current);
    }

    detectionTimeoutRef.current = setTimeout(() => {
      resetDetection();
    }, config.detectionTimeWindow);
  }, [config.enabled, config.sensitivityThreshold, config.detectionTimeWindow, blockUserForPCDetection, resetDetection]);

  // Mouse event handlers with strict filtering
  const handleMouseDown = useCallback((event: MouseEvent) => {
    // Only trigger on actual mouse events, not simulated ones from touch
    // event.detail === 0 usually indicates programmatic event
    if (event.isTrusted && event.detail !== 0) {
      addMouseEvent("mousedown", event);
    }
  }, [addMouseEvent]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    // Detect mouse movement (more reliable than clicks for detection)
    // Only count movements with actual mouse delta values
    if (event.isTrusted && 
        event.movementX !== undefined && 
        event.movementY !== undefined &&
        (Math.abs(event.movementX) > 1 || Math.abs(event.movementY) > 1)) {
      addMouseEvent("mousemove", event);
    }
  }, [addMouseEvent]);

  const handleMouseClick = useCallback((event: MouseEvent) => {
    // Additional click detection
    if (event.isTrusted && event.detail > 0) {
      addMouseEvent("click", event);
    }
  }, [addMouseEvent]);

  const handlePointerDown = useCallback((event: PointerEvent) => {
    // Detect pointer events that are clearly from mouse
    if (!config.excludePointerEvents && 
        event.isTrusted && 
        event.pointerType === "mouse") {
      addMouseEvent("pointer-mouse");
    }
  }, [config.excludePointerEvents, addMouseEvent]);

  const handleContextMenu = useCallback((event: MouseEvent) => {
    // Right-click detection (very strong indicator of mouse usage)
    if (event.isTrusted) {
      addMouseEvent("contextmenu", event);
    }
  }, [addMouseEvent]);

  // Manual detection trigger (for testing or immediate checking)
  const triggerManualDetection = useCallback(() => {
    if (!hasTriggeredRef.current) {
      console.log("🧪 Manual PC detection triggered");
      addMouseEvent("manual-trigger-1");
      addMouseEvent("manual-trigger-2");
      addMouseEvent("manual-trigger-3");
    }
  }, [addMouseEvent]);

  // Setup event listeners
  useEffect(() => {
    if (!config.enabled || typeof window === "undefined") {
      return;
    }

    // Only setup detection if device characteristics suggest possible PC usage
    // Don't detect on clearly mobile devices, but be suspicious of ambiguous cases
    const shouldSkipDetection = deviceInfo.isMobile && 
                               deviceInfo.hasTouch && 
                               deviceInfo.maxTouchPoints > 1 &&
                               deviceInfo.screenWidth < 1024;

    if (shouldSkipDetection) {
      console.log("📱 Skipping PC detection on clearly mobile device", deviceInfo);
      return;
    }

    console.log("🔍 PC detection active", {
      deviceInfo,
      config,
      shouldSkipDetection,
    });

    isDetectionActiveRef.current = true;

    // Add event listeners with passive: false to ensure we can detect them properly
    const options = { passive: true, capture: true };
    
    document.addEventListener("mousedown", handleMouseDown, options);
    document.addEventListener("mousemove", handleMouseMove, options);
    document.addEventListener("click", handleMouseClick, options);
    document.addEventListener("contextmenu", handleContextMenu, options);
    
    if (!config.excludePointerEvents) {
      document.addEventListener("pointerdown", handlePointerDown, options);
    }

    return () => {
      isDetectionActiveRef.current = false;
      
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("click", handleMouseClick);
      document.removeEventListener("contextmenu", handleContextMenu);
      
      if (!config.excludePointerEvents) {
        document.removeEventListener("pointerdown", handlePointerDown);
      }

      // Cleanup timeout
      if (detectionTimeoutRef.current) {
        clearTimeout(detectionTimeoutRef.current);
        detectionTimeoutRef.current = null;
      }
    };
  }, [
    config.enabled,
    config.excludePointerEvents,
    deviceInfo.isMobile,
    deviceInfo.hasTouch,
    deviceInfo.maxTouchPoints,
    deviceInfo.screenWidth,
    handleMouseDown,
    handleMouseMove,
    handleMouseClick,
    handleContextMenu,
    handlePointerDown,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      resetDetection();
    };
  }, [resetDetection]);

  return {
    isDetectionActive: isDetectionActiveRef.current,
    deviceInfo,
    triggerManualDetection,
  };
}