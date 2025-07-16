// src/locales/en/security.ts - Security system localization

export const security = {
    // Modal titles
    captchaTitle: "Security Verification",
    biometricTitle: "Biometric Authentication",
    gyroscopeTitle: "Motion Verification",

    // Modal descriptions
    captchaDescription: "Please solve the math problem to continue",
    biometricDescription: "Please authenticate using your device biometrics",
    gyroscopeDescription: "Shake or tilt your device to verify",

    // Common elements
    timeRemaining: "Time remaining",
    attempt: "Attempt",
    of: "of",
    seconds: "seconds",

    // Captcha specific
    enterCode: "Enter the answer",
    solveProblem: "Solve the problem",
    mathChallenge: "Math Challenge",

    // Biometric specific
    touchSensor: "Touch the sensor or look at the camera to authenticate",
    biometricNotAvailable: "Biometric authentication is not available on this device",
    biometricAccessDenied: "Biometric access denied. Please enable biometric authentication in settings.",
    openSettings: "Open Biometric Settings",

    // Gyroscope specific
    shakeDevice: "Shake or tilt your device",
    motionDetected: "Motion detected",
    motionInstructions: "Move your device in any direction to verify you are human",
    gyroscopeNotSupported: "Motion sensors not supported on this device",

    // Actions
    verify: "Verify",
    authenticating: "Authenticating...",
    verifying: "Verifying...",
    processing: "Processing...",

    // Error states
    verificationFailed: "Verification failed",
    timeExpired: "Time expired",
    tryAgain: "Try again",
    authenticationTimeout: "Authentication timeout",

    // Trust score related
    trustScoreUpdated: "Security score updated",
    securityCheckRequired: "Security verification required",
    lowTrustScore: "Additional security check needed",

    // Block warnings
    accountBlocked: "Account will be temporarily blocked if verification fails",
    securityMeasure: "This is a security measure to protect the platform",

    // Success messages
    verificationSuccessful: "Verification successful",
    authenticationSuccessful: "Authentication successful",
    securityCheckPassed: "Security check passed",

    // General security
    securityNotice: "Security Notice",
    verificationRequired: "Verification Required",
    protectingPlatform: "Protecting platform integrity",
} as const;