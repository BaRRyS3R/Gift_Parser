// src/locales/en/nebula.ts - Nebula Security System (English) - Updated with new permission-related blocks

export const nebula = {
    // Main verification page
    verification: {
        title: "SECURITY VERIFICATION",
        subtitle: "Your account requires additional security verification",
        trustScore: "Current Trust Level",
        requiredThreshold: "Required threshold: {threshold}",
        loading: "Checking security status...",
        error: "Security check failed",
        tryAgain: "TRY AGAIN",
        startVerification: "START VERIFICATION",
        verificationInProgress: "Verification in progress...",

        // Warnings
        warningCritical: "CRITICALLY IMPORTANT",
        warningLeaving: "DO NOT LEAVE THIS PAGE!",
        warningBan: "Closing this page or navigating away will result in account blocking. Complete verification within 15 seconds.",
        warningBiometricSafe: "Safe Navigation During Setup",
        warningBiometricText: "You may safely leave this application while granting biometric permissions. Your verification session will remain active and you can return at any time during the permission setup process.",

        // Verification types
        types: {
            captcha: {
                name: "CAPTCHA",
                description: "Solve a math problem. If you can manage it, of course.",
            },
            biometric: {
                name: "BIOMETRIC",
                description: "Use biometric authentication. We hope your fingers still work.",
            },
            gyroscope: {
                name: "GYROSCOPE",
                description: "Spin your device around. Don't overdo it or you'll get dizzy.",
            },
        },

        // Results
        success: {
            title: "VERIFICATION SUCCESSFUL",
            message: "Your identity has been successfully verified. Your trust score has been restored.",
            redirecting: "Redirecting to application...",
        },

        failure: {
            title: "VERIFICATION FAILED",
            message: "Identity verification was unsuccessful. Your account will be temporarily blocked.",
            redirecting: "Redirecting to blocked page...",
        },
    },

    // Captcha modal
    captcha: {
        title: "SECURITY CHALLENGE",
        subtitle: "Complete the challenge to verify your identity",
        generating: "Generating challenge...",
        enterResult: "Enter the result of this calculation",
        enterAnswer: "Enter answer",
        timeRemaining: "remaining",
        verifying: "Verifying...",
        verifyAnswer: "VERIFY ANSWER",
        singleAttempt: "Single attempt only - calculate carefully!",
        failed: "Failed to load challenge",
        noAttemptId: "No verification attempt found",
        timeout: "Time expired",
        warning: "Security verification required due to low trust score. Your account will be temporarily blocked if verification fails.",
    },

    // Biometric modal  
    biometric: {
        title: "BIOMETRIC AUTHENTICATION REQUIRED",
        subtitle: "Your trust score is low. Please authenticate using biometrics to continue.",

        // Phases
        initializing: "Initializing biometric authentication...",
        checkingAvailability: "Checking biometric availability...",
        permissionRequired: "BIOMETRIC PERMISSION REQUIRED",
        permissionInstructions: "You need to grant biometric authentication permission to continue",
        grantPermission: "REQUEST PERMISSION",
        checkPermission: "CHECK PERMISSION STATUS",
        openSettings: "Open Biometric Settings",

        // Instructions
        instructions: {
            title: "Instructions:",
            step1: "1. Tap \"Request Permission\" below",
            step2: "2. You may need to temporarily leave the app to enable biometric access in settings",
            step3: "3. Return to this app and tap \"Check Permission Status\"",
            step4: "4. If permission is granted, authentication will begin automatically",
        },

        // Authentication
        authentication: {
            title: "{type} Authentication",
            touchSensor: "Touch the sensor or look at the camera to authenticate",
            authenticate: "AUTHENTICATE",
            authenticating: "Authenticating...",
            pleaseComplete: "Please complete biometric authentication on your device",
            singleAttempt: "Single attempt only - be careful!",
        },

        // Biometric types
        types: {
            fingerprint: "Fingerprint",
            faceId: "Face ID",
            biometric: "Biometric",
        },

        // Errors and unavailability
        errors: {
            deviceNotSupported: "Device Not Supported",
            unavailable: "Biometrics unavailable on this device",
            verificationFailed: "Verification Failed",
            permissionDenied: "Biometric permission was not granted",
            permissionCheckFailed: "Failed to check permission status",
            timeout: "Authentication timeout",
            noData: "No biometric data detected",
        },

        // Warnings
        securityPolicy: "Security Policy",
        securityPolicyText: "Due to security requirements, accounts with very low trust scores require biometric authentication. Since your device does not support this feature, your account will be blocked for security reasons.",
        unavailableWarning: "Biometric authentication is unavailable on your device. Your account will be blocked in accordance with security policy.",
        permissionWarning: "Biometric authentication permission is required to continue. Denying permission will result in account blocking.",
        leaveAppSafe: "Safe to Leave App",
        leaveAppSafeText: "You can safely minimize or switch away from this app while granting biometric permission. Your verification session will remain active.",

        blockWarning: "Your account will be blocked for 2 days due to device incompatibility.",
        blockWarningFailed: "Biometric verification required due to low trust score. Your account will be blocked for 2 days if verification fails.",
        blockWarningUnavailable: "Your account will be blocked for 2 days as biometrics are unavailable on the device.",
        blockWarningPermissionDenied: "Your account will be blocked for 2 days due to biometric permission denial.",

        success: {
            title: "VERIFICATION SUCCESSFUL",
            message: "Your identity has been verified successfully",
            restoring: "Your trust score has been restored. Redirecting to the application...",
        },
    },

    // Gyroscope modal
    gyroscope: {
        title: "GYROSCOPE AUTHENTICATION REQUIRED",
        subtitle: "Your trust score is extremely low. Please complete gyroscope verification to continue.",

        // Phases
        initializing: "Initializing gyroscope verification...",
        checkingAvailability: "Checking gyroscope availability...",
        permissionRequired: "GYROSCOPE PERMISSION REQUIRED",
        permissionInstructions: "You need to grant gyroscope access permission to continue",
        grantPermission: "REQUEST PERMISSION",
        checkPermission: "CHECK PERMISSION STATUS",

        // Movement instructions
        movementInstructions: "Movement Instructions",
        deviceInstructions: "You will need to move your device to complete verification",
        requiredMovements: "Required Movements:",
        movement1: "• Tilt your device left and right",
        movement2: "• Tilt your device forward and backward",
        movement3: "• Rotate your device clockwise or counterclockwise",
        movementCount: "Complete {count} distinct movements within 15 seconds",

        // Permission instructions
        permissionInstructions2: {
            title: "Instructions:",
            step1: "1. Tap \"Request Permission\" below",
            step2: "2. You may need to temporarily leave the app to enable gyroscope access in settings",
            step3: "3. Return to this app and tap \"Check Permission Status\"",
            step4: "4. If permission is granted, verification will begin automatically",
        },

        // Verification
        startVerification: "START VERIFICATION",
        movementsDetected: "Movements Detected",
        moveDevice: "Move your device in different directions",
        startMoving: "Start moving your device...",
        keepMoving: "Keep moving...",
        verificationComplete: "Verification complete!",

        // Warnings
        important: "Important",
        oneAttempt: "You have only one attempt to complete this verification. Make sure your device can move freely before starting.",

        // Errors and unavailability
        errors: {
            deviceNotSupported: "Your device does not support gyroscope verification",
            unavailable: "Gyroscope unavailable on this device",
            permissionDenied: "Gyroscope permission was not granted",
            permissionCheckFailed: "Failed to check gyroscope permission status",
            noData: "No gyroscope data detected",
            timeout: "Verification timeout",
            verificationFailed: "Verification failed",
        },

        securityPolicy: "Security Policy",
        securityPolicyText: "Accounts with extremely low trust scores require gyroscope verification. Since your device does not support this feature, your account will be temporarily blocked.",
        unavailableWarning: "Gyroscope verification is unavailable on your device. Your account will be blocked in accordance with security policy.",
        permissionWarning: "Gyroscope access permission is required to continue. Denying permission will result in account blocking.",

        blockWarning: "Your account will be blocked for 1 month due to device incompatibility.",
        blockWarningFailed: "Gyroscope verification required due to extremely low trust score. Your account will be blocked for 1 month if verification fails.",
        blockWarningUnavailable: "Your account will be blocked for 1 month as gyroscope is unavailable on the device.",
        blockWarningPermissionDenied: "Your account will be blocked for 1 month due to gyroscope permission denial.",

        success: {
            title: "ROTATION STOPPED",
            message: "Your identity has been verified successfully",
            restoring: "Your trust score has been restored. Redirecting to the application...",
        },
    },

    // Blocked page
    blocked: {
        title: "ACCOUNT BLOCKED",
        subtitle: "Your account has been temporarily blocked for security reasons",

        // Block information
        blockReason: "Block Reason",
        timeRemaining: "Time Remaining",
        blockedAt: "Blocked At:",
        unblockAt: "Unblock At:",
        trustScoreAtBlock: "Trust Score at Block:",
        verificationType: "Verification type: {type}",

        // Block reasons
        reasons: {
            failed_captcha: "Failed to complete security challenge verification",
            failed_biometric: "Failed biometric authentication verification",
            failed_gyroscope: "Failed device movement verification",
            device_unsupported_biometric: "Device does not support biometric authentication",
            device_unsupported_gyroscope: "Device does not support gyroscope verification",
            biometric_unavailable: "Biometric authentication unavailable on device",
            gyroscope_unavailable: "Gyroscope verification unavailable on device",
            biometric_permission_denied: "Biometric authentication permission denied",
            gyroscope_permission_denied: "Gyroscope access permission denied",
            manual_block: "Account manually blocked by administrator",
            suspicious_activity: "Suspicious activity detected on account",
            abandoned_verification: "Verification was abandoned or left",
            default: "Security verification required",
        },

        // What happens next
        whatNext: "What happens next?",
        whatNextSteps: [
            "• Your account will be automatically unblocked when the time expires",
            "• You will be redirected to the login page",
            "• Your trust score may be adjusted based on the security verification",
        ],

        // Actions
        checkStatus: "CHECK STATUS",
        checking: "Checking...",
        autoRefresh: "This page will automatically check for unblock when the timer expires",
        checkingForUnblock: "Checking for automatic unblock...",

        // States
        loading: "Checking account status...",
        error: "Error",
        statusUnknown: "Account Status Unknown",
        unableToCheck: "Unable to determine account block status.",

        // Unblock
        unblocked: {
            title: "ACCOUNT UNBLOCKED",
            message: "Your account has been successfully unblocked. You can now access the application.",
            redirecting: "Redirecting to login page...",
        },

        // Appeal contact
        appeal: {
            title: "Think the block was a mistake?",
            subtitle: "If you believe your account was blocked in error",
            contact: "Contact us:",
            contactLink: "https://t.me/mrmrcrowley",
            contactText: "@mrmrcrowley",
            note: "Note: We only review genuinely erroneous blocks. Attempts to appeal fair blocks will be ignored.",
        },

        // Time formatting
        timeFormat: {
            expired: "Expired",
            days: "{count}d",
            hours: "{count}h",
            minutes: "{count}m",
            seconds: "{count}s",
        },
    },

    // Common elements
    common: {
        close: "CLOSE",
        success: "SUCCESS",
        error: "ERROR",
        loading: "LOADING...",
        tryAgain: "TRY AGAIN",
        timeRemaining: "Time Remaining",
        verificationRequired: "Verification Required",
        securityCheck: "Security Check",
        trustScore: "Trust Score",
        blockedTemporarily: "Temporarily Blocked",
        contactSupport: "Contact Support",
    },
} as const;