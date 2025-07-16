// src/hooks/useSecurityProtection.ts - Enhanced client-side security logic

"use client";

import { useState, useRef, useCallback } from 'react';

interface MotionSample {
  timestamp: number;
  motion: number;
  alpha: number;
  beta: number;
  gamma: number;
}

interface SecurityFingerprint {
  sessionId: string;
  startTime: number;
  samples: MotionSample[];
  checkPoints: number[];
  integrity: string;
}

interface VerificationData {
  samples: number;
  intensity: number;
  signature: string;
  timestamps: number[];
  fingerprint: string;
}

export function useSecurityProtection() {
  const [securityFingerprint, setSecurityFingerprint] = useState<SecurityFingerprint | null>(null);
  const verificationStateRef = useRef({
    isActive: false,
    startTime: 0,
    checksum: '',
    validators: new Set<string>()
  });

  // Generate cryptographic signature for motion data
  const generateMotionSignature = useCallback((samples: MotionSample[], startTime: number): string => {
    const dataPoints = samples.map(s => 
      `${s.timestamp}:${Math.floor(s.motion * 100)}:${Math.floor(s.alpha || 0)}:${Math.floor(s.beta || 0)}:${Math.floor(s.gamma || 0)}`
    ).join('|');
    
    const signatureData = `${startTime}:${samples.length}:${dataPoints}`;
    
    let hash = 0;
    for (let i = 0; i < signatureData.length; i++) {
      const char = signatureData.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return hash.toString(36);
  }, []);

  // Generate session fingerprint
  const generateSessionFingerprint = useCallback((): string => {
    const navigation = performance.navigation;
    const screen = window.screen;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    const fingerprint = [
      navigation.type,
      screen.width,
      screen.height,
      screen.colorDepth,
      timeZone,
      Date.now().toString(36)
    ].join(':');
    
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return hash.toString(36);
  }, []);

  // Initialize protected verification session
  const initializeVerificationSession = useCallback((): string => {
    const sessionId = generateSessionFingerprint();
    const startTime = Date.now();
    
    const fingerprint: SecurityFingerprint = {
      sessionId,
      startTime,
      samples: [],
      checkPoints: [],
      integrity: ''
    };
    
    // Generate initial integrity check
    fingerprint.integrity = generateMotionSignature([], startTime);
    
    setSecurityFingerprint(fingerprint);
    
    // Initialize verification state with protection
    verificationStateRef.current = {
      isActive: true,
      startTime,
      checksum: generateStateChecksum(startTime, sessionId),
      validators: new Set(['init', 'timing', 'motion', 'integrity'])
    };
    
    return sessionId;
  }, [generateSessionFingerprint, generateMotionSignature]);

  // Generate state checksum for integrity validation
  const generateStateChecksum = useCallback((startTime: number, sessionId: string): string => {
    const data = `${startTime}:${sessionId}:${verificationStateRef.current.isActive}`;
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }, []);

  // Validate state integrity
  const validateStateIntegrity = useCallback((): boolean => {
    if (!securityFingerprint || !verificationStateRef.current.isActive) {
      return false;
    }
    
    const expectedChecksum = generateStateChecksum(
      verificationStateRef.current.startTime,
      securityFingerprint.sessionId
    );
    
    const isValid = expectedChecksum === verificationStateRef.current.checksum;
    
    if (!isValid) {
      console.warn('State integrity validation failed');
    }
    
    return isValid;
  }, [securityFingerprint, generateStateChecksum]);

  // Add motion sample with validation
  const addMotionSample = useCallback((
    alpha: number,
    beta: number,
    gamma: number,
    motion: number
  ): boolean => {
    if (!securityFingerprint || !validateStateIntegrity()) {
      return false;
    }
    
    const now = Date.now();
    const sample: MotionSample = {
      timestamp: now,
      motion,
      alpha,
      beta,
      gamma
    };
    
    // Update fingerprint with new sample
    const updatedFingerprint = {
      ...securityFingerprint,
      samples: [...securityFingerprint.samples, sample],
      checkPoints: [...securityFingerprint.checkPoints, now]
    };
    
    // Recalculate integrity
    updatedFingerprint.integrity = generateMotionSignature(
      updatedFingerprint.samples,
      updatedFingerprint.startTime
    );
    
    setSecurityFingerprint(updatedFingerprint);
    
    return true;
  }, [securityFingerprint, validateStateIntegrity, generateMotionSignature]);

  // Multiple validation checks
  const performSecurityValidation = useCallback((): {
    isValid: boolean;
    checks: Record<string, boolean>;
    verificationData?: VerificationData;
  } => {
    if (!securityFingerprint) {
      return { isValid: false, checks: { session: false } };
    }
    
    const now = Date.now();
    const duration = now - securityFingerprint.startTime;
    
    const checks = {
      stateIntegrity: validateStateIntegrity(),
      minimumDuration: duration >= 3000,
      maximumDuration: duration <= 15000,
      sufficientSamples: securityFingerprint.samples.length >= 15,
      validMotion: securityFingerprint.samples.reduce((sum, s) => sum + s.motion, 0) >= 250,
      validDistribution: securityFingerprint.checkPoints.length > 0 && 
        (Math.max(...securityFingerprint.checkPoints) - Math.min(...securityFingerprint.checkPoints)) >= 2400,
      validSessionId: securityFingerprint.sessionId.length > 0,
      noDevToolsDetected: !detectDevTools()
    };
    
    const isValid = Object.values(checks).every(check => check);
    
    let verificationData: VerificationData | undefined;
    
    if (isValid) {
      const totalIntensity = securityFingerprint.samples.reduce((sum, s) => sum + s.motion, 0);
      const signature = generateMotionSignature(securityFingerprint.samples, securityFingerprint.startTime);
      
      verificationData = {
        samples: securityFingerprint.samples.length,
        intensity: totalIntensity,
        signature,
        timestamps: securityFingerprint.checkPoints,
        fingerprint: securityFingerprint.sessionId
      };
    }
    
    return { isValid, checks, verificationData };
  }, [securityFingerprint, validateStateIntegrity, generateMotionSignature]);

  // DevTools detection
  const detectDevTools = useCallback((): boolean => {
    let devToolsOpen = false;
    
    try {
      // Method 1: Console detection
      const start = Date.now();
      // eslint-disable-next-line no-debugger
      debugger;
      const end = Date.now();
      if (end - start > 100) {
        devToolsOpen = true;
      }
      
      // Method 2: Window size detection
      const threshold = 160;
      if (window.outerHeight - window.innerHeight > threshold || 
          window.outerWidth - window.innerWidth > threshold) {
        devToolsOpen = true;
      }
      
      // Method 3: Console object detection
      if (window.console && window.console.clear) {
        const originalClear = window.console.clear;
        window.console.clear = function(...args) {
          devToolsOpen = true;
          originalClear.apply(window.console, args);
        };
      }
    } catch (error) {
      // DevTools might be interfering
      devToolsOpen = true;
    }
    
    return devToolsOpen;
  }, []);

  // Complete verification process
  const completeVerification = useCallback((): {
    success: boolean;
    verificationData?: VerificationData;
    reason?: string;
  } => {
    const validation = performSecurityValidation();
    
    if (!validation.isValid) {
      const failedChecks = Object.entries(validation.checks)
        .filter(([_, passed]) => !passed)
        .map(([check]) => check);
      
      return {
        success: false,
        reason: `Security validation failed: ${failedChecks.join(', ')}`
      };
    }
    
    // Mark verification as completed
    verificationStateRef.current.isActive = false;
    
    return {
      success: true,
      verificationData: validation.verificationData
    };
  }, [performSecurityValidation]);

  // Reset verification state
  const resetVerification = useCallback(() => {
    setSecurityFingerprint(null);
    verificationStateRef.current = {
      isActive: false,
      startTime: 0,
      checksum: '',
      validators: new Set()
    };
  }, []);

  return {
    initializeVerificationSession,
    addMotionSample,
    performSecurityValidation,
    completeVerification,
    resetVerification,
    validateStateIntegrity,
    getSessionInfo: () => securityFingerprint,
    isVerificationActive: () => verificationStateRef.current.isActive
  };
}