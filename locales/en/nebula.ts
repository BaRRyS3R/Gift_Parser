// src/locales/en/nebula.ts - Updated localization with new strings for improved logic

export const nebula = {
    verification: {
        title: "SECURITY VERIFICATION",
        subtitle: "Your account requires additional security verification",
        trustScore: "Current trust level",
        requiredThreshold: "Required threshold: {threshold}",
        loading: "Checking security status...",
        error: "Security verification failed",
        tryAgain: "TRY AGAIN",
        startVerification: "START VERIFICATION",
        verificationInProgress: "Verification in progress...",

        warningCritical: "CRITICALLY IMPORTANT",
        warningLeaving: "DO NOT LEAVE THIS PAGE!",
        warningBan: "Closing this page or navigating elsewhere will result in account blocking. Complete verification within 15 seconds.",
        warningBiometricSafe: "Safe navigation during setup",
        warningBiometricText: "You may safely leave the app while granting biometric permissions. Your verification session will remain active and you can return anytime during the setup process.",

        types: {
            captcha: {
                name: "CAPTCHA",
                description: "Solve the puzzle. If you can, of course.",
            },
            biometric: {
                name: "BIOMETRICS",
                description: "Use biometric authentication. Hopefully, your fingers still work.",
            },
            gyroscope: {
                name: "GYROSCOPE",
                description: "Move your device around. But don't overdo it or you might get dizzy.",
            },
        },

        permissionStatus: {
            checking: "Checking {type} support...",
            granted: "{type} is ready to use",
            prompt: "Permission required for {type}",
            denied: "Permission for {type} denied",
            unavailable: "{type} is not supported on this device",

            typeNames: {
                biometric: "biometrics",
                gyroscope: "gyroscope",
                captcha: "captcha",
            },
        },

        success: {
            title: "VERIFICATION SUCCESSFUL",
            message: "Your identity has been verified. Your trust score has been restored.",
            redirecting: "Redirecting to app...",
        },

        failure: {
            title: "VERIFICATION FAILED",
            message: "Identity verification failed. Your account will be temporarily blocked.",
            redirecting: "Redirecting to block page...",
        },
    },

    captcha: {
        title: "SECURITY CHALLENGE",
        subtitle: "Complete the task to confirm your identity",
        generating: "Generating task...",
        enterResult: "Enter the result of this calculation",
        enterAnswer: "Enter your answer",
        timeRemaining: "time left",
        verifying: "Verifying...",
        verifyAnswer: "VERIFY ANSWER",
        singleAttempt: "Only one attempt – pay attention!",
        failed: "Failed to load the task",
        noAttemptId: "Verification attempt not found",
        timeout: "Time expired",
        warning: "Security verification is required due to low trust score. Your account will be temporarily blocked if verification fails.",
    },

    biometric: {
        title: "BIOMETRIC AUTHENTICATION REQUIRED",
        subtitle: "Your trust score is low. Please complete biometric authentication to proceed.",

        phases: {
            checking_availability: "Checking biometric availability...",
            permission_required: "Biometric permission required",
            ready_to_authenticate: "Ready to authenticate",
            authenticating: "Authenticating...",
            success: "Verification successful",
            failed: "Verification failed",
            device_unsupported: "Device not supported",
            permission_denied_final: "Permission permanently denied",
        },

        states: {
            checking: "Checking...",
            ready: "Ready to authenticate with {type}",
            readyDescription: "Permissions granted. Click the button below to begin verification.",
            preparing: "Preparing...",
            requestingPermission: "Requesting permission...",
        },

        actions: {
            startVerification: "Start verification",
            grantPermission: "GRANT PERMISSION",
            checkPermissions: "Check permissions",
            openSettings: "Open biometric settings",
            tryAgain: "Try again",
        },

        instructions: {
            title: "Instructions:",
            step1: "1. Click 'Grant Permission' below",
            step2: "2. You may need to temporarily leave the app to enable biometric access in settings",
            step3: "3. Return to this app, and authentication will start automatically",
            permissionRequired: "BIOMETRIC PERMISSION REQUIRED",
            permissionInstructions: "You must grant biometric permission to proceed",
        },

        authentication: {
            title: "Authentication: {type}",
            touchSensor: "Touch the sensor or look at the camera to authenticate",
            authenticate: "AUTHENTICATE",
            authenticating: "Authenticating...",
            pleaseComplete: "Please complete biometric authentication on your device",
            singleAttempt: "Only one attempt – be careful!",
        },

        types: {
            fingerprint: "Fingerprint",
            faceId: "Face ID",
            biometric: "Biometrics",
        },

        errors: {
            deviceNotSupported: "Device not supported",
            verificationFailed: "Verification failed",
            permissionDenied: "Permission not granted. Please enable it in your device settings.",
            timeout: "Authentication timeout",
            noData: "No biometric data found",
            permissionCheckFailed: "Permission check failed",
            maxAttemptsExceeded: "Maximum permission check attempts exceeded",
            deceptionAttempt: "Attempt to deceive the security system detected",
        },

        security: {
            policy: "Security policy",
            policyText: "Due to security policies, accounts with very low trust scores require biometric authentication. Since your device does not support this feature, your account will be blocked for security reasons.",
            leaveAppSafe: "Leave the app safely",
            leaveAppSafeText: "You can safely switch away from this app while granting biometric permission. Your verification session will remain active.",
            blockWarning: "Your account will be blocked for 2 days due to device incompatibility.",
            blockWarningFailed: "Biometric verification is required due to low trust score. Your account will be blocked for 2 days if verification fails.",
            attemptWarning: "Warning: If you exceed the limit of permission checks, your account will be blocked for attempted deception.",
            finalBlockWarning: "Your account will be blocked for attempting to deceive the security system.",
        },

        success: {
            title: "VERIFICATION SUCCESSFUL",
            message: "Your identity has been verified",
            restoring: "Your trust score has been restored. Redirecting to app...",
        },
    },

    gyroscope: {
        title: "GYROSCOPE AUTHENTICATION REQUIRED",
        subtitle: "Your trust score is extremely low. Please complete gyroscope verification to proceed.",

        initializing: "Initializing gyroscope verification...",
        permissionRequired: "GYROSCOPE PERMISSION REQUIRED",
        permissionInstructions: "You must grant gyroscope access permission to proceed",
        grantPermission: "GRANT PERMISSION",
        recheckPermissions: "Check permissions",
        checkingPermissions: "Checking permissions...",
        requestingPermission: "Requesting permission...",

        movementInstructions: "Movement instructions",
        deviceInstructions: "You will need to move your device to complete verification",
        requiredMovements: "Required movements:",
        movement1: "• Tilt your device left and right",
        movement2: "• Tilt your device forward and backward",
        movement3: "• Rotate your device clockwise or counterclockwise",
        movementCount: "Complete {count} different movements within 15 seconds",

        startVerification: "START VERIFICATION",
        movementsDetected: "Movements detected",
        moveDevice: "Move your device in different directions",
        startMoving: "Start moving the device...",
        keepMoving: "Keep moving...",
        verificationComplete: "Verification complete!",

        important: "Important",
        oneAttempt: "You only have one attempt to complete this verification. Make sure your device can move freely before starting.",

        errors: {
            deviceNotSupported: "Your device does not support gyroscope verification",
            permissionDenied: "Gyroscope permission was denied. Please enable it in your device settings.",
            noData: "No gyroscope data found",
            timeout: "Verification timeout",
            verificationFailed: "Verification failed",
            permissionCheckFailed: "Permission check failed",
        },

        securityPolicy: "Security policy",
        securityPolicyText: "Accounts with extremely low trust scores require gyroscope verification. Since your device doesn't support this feature, your account will be temporarily blocked.",

        blockWarning: "Your account will be blocked for 1 month due to device incompatibility.",
        blockWarningFailed: "Gyroscope verification is required due to extremely low trust score. Your account will be blocked for 1 month if verification fails.",

        success: {
            title: "SPIN STOPPED",
            message: "Your identity has been verified",
            restoring: "Your trust score has been restored. Redirecting to app...",
        },
    },

    blocked: {
        title: "ACCOUNT BLOCKED",
        subtitle: "Your account has been temporarily blocked for security reasons",

        blockReason: "Reason for block",
        timeRemaining: "Time remaining",
        blockedAt: "Blocked at:",
        unblockAt: "Unblock at:",
        trustScoreAtBlock: "Trust score at block:",
        verificationType: "Verification type: {type}",

        reasons: {
            failed_captcha: "Failed to complete security challenge verification",
            failed_biometric: "Failed to complete biometric authentication",
            failed_gyroscope: "Failed to complete device movement verification",
            device_unsupported_biometric: "Device does not support biometric authentication",
            device_unsupported_gyroscope: "Device does not support gyroscope verification",
            manual_block: "Account manually blocked by administrator",
            suspicious_activity: "Suspicious activity detected on account",
            verification_abandonment: "Verification was abandoned or exited",
            exceeded_permission_check_attempts: "Exceeded permission check attempts (deception attempt)",
            deception_attempt: "Attempt to deceive the security system detected",
            default: "Security verification required",
        },

        whatNext: "What happens next?",
        whatNextSteps: [
            "• Your account will be automatically unblocked after the timer ends",
            "• You will be redirected to the login page",
            "• Your trust score may be adjusted based on verification results",
        ],

        checkStatus: "CHECK STATUS",
        checking: "Checking...",
        autoRefresh: "This page will automatically check for unblock after the timer ends",
        checkingForUnblock: "Checking automatic unblock...",

        loading: "Checking account status...",
        error: "Error",
        statusUnknown: "Account status unknown",
        unableToCheck: "Unable to determine account block status.",

        unblocked: {
            title: "ACCOUNT UNBLOCKED",
            message: "Your account has been successfully unblocked. You may now access the app.",
            redirecting: "Redirecting to login page...",
        },

        appeal: {
            title: "Think the block is a mistake?",
            subtitle: "If you believe your account was blocked by mistake",
            contact: "Contact us:",
            contactLink: "https://t.me/mrmrcrowley",
            contactText: "@mrmrcrowley",
            note: "Note: We only review genuinely mistaken blocks. Attempts to appeal valid blocks will be ignored.",
        },

        timeFormat: {
            expired: "Expired",
            days: "{count}d",
            hours: "{count}h",
            minutes: "{count}m",
            seconds: "{count}s",
        },
    },

    common: {
        close: "CLOSE",
        success: "SUCCESS",
        error: "ERROR",
        loading: "LOADING...",
        tryAgain: "TRY AGAIN",
        timeRemaining: "Time remaining",
        verificationRequired: "Verification required",
        securityCheck: "Security check",
        trustScore: "Trust score",
        blockedTemporarily: "Temporarily blocked",
        contactSupport: "Contact support",
        checking: "Checking...",
        checkingPermissions: "Checking permissions...",
        recheckPermissions: "Check permissions",
        granted: "Granted",
        denied: "Denied",
        unavailable: "Unavailable",
    },
} as const;
