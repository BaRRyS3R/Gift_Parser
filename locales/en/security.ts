// src/locales/en/security.ts - Security system localization

export const security = {
    // Trust Score
    trustScore: "Trust Score",
    trustScoreGood: "Good",
    trustScoreFair: "Fair",
    trustScoreLow: "Low",
    trustScoreCritical: "Critical",
    trustScoreDescription: "Your security rating based on system interactions",

    // Security Checks
    securityVerification: "Security Verification",
    verificationRequired: "Verification Required",
    securityCheckInProgress: "Security check in progress...",
    silentSecurityCheck: "Checking security status...",

    // Captcha
    captchaTitle: "Security Verification",
    captchaDescription: "Please complete the captcha to continue",
    captchaPlaceholder: "Enter captcha code",
    captchaRefresh: "Refresh",
    captchaVerify: "Verify",
    captchaGenerating: "Generating captcha...",
    captchaInstructions: "Enter the code above",
    captchaTimeRemaining: "remaining",
    captchaAttempt: "Attempt",
    captchaOf: "of",
    captchaFailed: "Incorrect captcha",
    captchaTimeout: "Time expired. Please try again.",
    captchaWarning: "Security verification required. Your account will be temporarily blocked if verification fails.",

    // Biometric
    biometricTitle: "Biometric Verification",
    biometricDescription: "Please authenticate using your device biometrics",
    biometricInitializing: "Initializing biometric authentication...",
    biometricNotAvailable: "Biometric authentication is not available on this device",
    biometricAccessDenied: "Biometric access denied. Please enable biometric authentication in settings.",
    biometricAuthenticate: "Authenticate",
    biometricAuthenticating: "Authenticating...",
    biometricComplete: "Please complete biometric authentication on your device",
    biometricFailed: "Authentication failed",
    biometricAttemptsRemaining: "attempts remaining",
    biometricTimeout: "Authentication timeout. Please try again.",
    biometricWarning: "Biometric verification required due to low trust score. Your account will be blocked if verification fails.",
    biometricOpenSettings: "Open Biometric Settings",
    biometricFingerprint: "Fingerprint",
    biometricFaceId: "Face ID",
    biometricGeneric: "Biometric",
    biometricInstruction: "Touch the sensor or look at the camera to authenticate",
    biometricPermissionTimeout: "Permission request timeout",
    biometricRequestingAccess: "Requesting biometric access...",

    // Gyroscope
    gyroscopeTitle: "Motion Verification",
    gyroscopeDescription: "Please perform device rotation movements as instructed",
    gyroscopeInitializing: "Initializing motion sensors...",
    gyroscopeNotAvailable: "Motion sensors are not available on this device",
    gyroscopeStartVerification: "Start Verification",
    gyroscopeStep: "Step",
    gyroscopeStepOf: "of",
    gyroscopeFollowInstructions: "Follow the instructions above",
    gyroscopeStepInstructions: {
        step1: "Hold your device level and slowly rotate it left, then right",
        step2: "Tilt your device forward, then backward",
        step3: "Gently shake your device up and down 3 times",
    },
    gyroscopeWarning: "Critical Security Check: Motion verification is required due to very low trust score. Account will be permanently blocked if verification fails.",
    gyroscopeTimeout: "Verification timeout. Please try again.",
    gyroscopeFailed: "Motion verification failed",

    // Block Messages
    accountBlocked: "Account Temporarily Blocked",
    accountPermanentlyBlocked: "Account Permanently Blocked",
    securityMeasures: "Security measures are in place",
    blockReason: "Reason",
    timeRemaining: "Time Remaining",
    timeUntilUnblock: "Time until unblock",
    checkStatus: "Check Status",
    checkingStatus: "Checking Status...",
    returnToStart: "Return to Start",
    blockDuration: "Block duration",

    // Block Reasons
    suspiciousActivity: "Suspicious Activity Detected",

    // Block Descriptions
    captchaFailedDescription: "Your account was temporarily blocked due to failed captcha verification. This helps protect the system from automated access.",
    biometricFailedDescription: "Your account was temporarily blocked due to failed biometric authentication. This is a security measure to protect your account.",
    gyroscopeFailedDescription: "Your account was permanently blocked due to failed motion verification. This is a critical security measure.",
    suspiciousActivityDescription: "Your account was temporarily blocked due to detected suspicious activity. This helps maintain platform security.",

    // Block Durations
    captchaBlockDuration: "2 minutes",
    biometricBlockDuration: "24 hours",
    gyroscopeBlockDuration: "1 year",
    suspiciousBlockDuration: "10 minutes",

    // General Messages
    securityNotice: "Security Notice",
    lowTrustScore: "Your trust score is low. Additional security checks may be required.",
    verificationNeeded: "Verification Needed",
    accountSecurity: "Account Security",
    whatHappensNext: "What happens next?",
    automaticUnblock: "Your account will be automatically unblocked when the time expires",
    followGuidelines: "Follow security guidelines to improve your trust score",
    repeatedViolations: "Repeated violations may result in longer blocks",

    // UI States
    locked: "LOCKED",
    loading: "LOADING",
    checking: "CHECKING",
    verifying: "VERIFYING",
    failed: "FAILED",
    success: "SUCCESS",

    // Date and Time
    unblockDate: "Unblock Date",
    unblockTime: "Unblock Time",
    autoRefresh: "Auto-refresh in",
    pageWillRefresh: "Page will automatically refresh when unblocked",

    // Errors
    verificationFailed: "Verification failed",
    systemError: "System error occurred",
    tryAgain: "Try Again",
    unexpectedError: "An unexpected error occurred",
} as const;