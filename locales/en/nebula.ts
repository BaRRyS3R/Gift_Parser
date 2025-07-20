// src/locales/en/nebula.ts - Обновленная английская локализация с новыми текстами для исправленной системы

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

        // Enhanced warnings with better guidance
        warningCritical: "CRITICALLY IMPORTANT",
        warningLeaving: "DO NOT LEAVE THIS PAGE!",
        warningBan: "Closing this page or navigating away will result in account blocking. Complete verification within the allotted time.",
        warningBiometricSafe: "Safe Navigation During Permission Setup",
        warningBiometricText: "You may safely leave this application while granting biometric or gyroscope permissions. Your verification session will remain active and you can return at any time during the permission setup process. Only avoid leaving during the actual authentication phase.",

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

    // Enhanced biometric modal  
    biometric: {
        title: "BIOMETRIC AUTHENTICATION REQUIRED",
        subtitle: "Your trust score is low. Please authenticate using biometrics to continue.",

        // Enhanced phases with better descriptions
        initializing: "Initializing biometric authentication...",
        checkingAvailability: "Checking biometric availability...",
        permissionRequired: "BIOMETRIC PERMISSION REQUIRED",
        permissionRequested: "PERMISSION REQUEST SENT",
        permissionInstructions: "You need to grant biometric authentication permission to continue",
        grantPermission: "REQUEST PERMISSION",
        checkPermission: "CHECK PERMISSION STATUS",
        checkingPermission: "Checking...",
        openSettings: "Open Biometric Settings",

        // Enhanced instructions with clearer steps
        instructions: {
            title: "Permission Setup Instructions:",
            step1: "1. Tap \"Request Permission\" below",
            step2: "2. If prompted, allow biometric access in the system dialog",
            step3: "3. If redirected to settings, enable biometric access for this app",
            step4: "4. Return here and tap \"Check Permission Status\" to verify",
            step5: "5. You may need to repeat steps 3-4 up to 3 times if the system doesn't update immediately",
        },

        // Authentication
        authentication: {
            title: "{type} Authentication",
            touchSensor: "Touch the sensor or look at the camera to authenticate",
            authenticate: "AUTHENTICATE",
            authenticating: "Authenticating...",
            pleaseComplete: "Please complete biometric authentication on your device",
            singleAttempt: "Single attempt only - be careful!",
            checkPermission: "Checking permissions...",
            try: "Try",
        },

        // Biometric types
        types: {
            fingerprint: "Fingerprint",
            faceId: "Face ID",
            biometric: "Biometric",
        },

        // Enhanced errors with better explanations
        errors: {
            deviceNotSupported: "Device Not Supported",
            unavailable: "Biometrics unavailable on this device",
            verificationFailed: "Verification Failed",
            permissionDenied: "Biometric permission was not granted after multiple attempts",
            permissionCheckFailed: "Checking permission status...",
            timeout: "Authentication timeout - please try to complete faster",
            noData: "No biometric data detected",
        },

        // Enhanced warnings with better guidance
        securityPolicy: "Security Policy",
        securityPolicyText: "Due to security requirements, accounts with very low trust scores require biometric authentication. Since your device does not support this feature, your account will be blocked for security reasons.",
        unavailableWarning: "Biometric authentication is unavailable on your device. Your account will be blocked in accordance with security policy.",

        // Updated permission warning with attempt tracking
        permissionWarning: "Biometric authentication permission is required to continue. You have multiple attempts to grant permission. Denying permission after all attempts will result in account blocking.",

        leaveAppSafe: "Safe to Leave App During Permission Setup",
        leaveAppSafeText: "You can safely minimize or switch away from this app while granting biometric permission. Your verification session will remain active. Only stay on this page during the actual authentication phase.",

        // Enhanced block warnings with attempt context
        blockWarning: "Your account will be blocked for 2 days due to device incompatibility.",
        blockWarningFailed: "Biometric verification required due to low trust score. Your account will be blocked for 2 days if verification fails.",
        blockWarningUnavailable: "Your account will be blocked for 2 days as biometrics are unavailable on the device.",
        blockWarningPermissionDenied: "Your account will be blocked for 2 days due to biometric permission denial after multiple attempts.",

        success: {
            title: "VERIFICATION SUCCESSFUL",
            message: "Your identity has been verified successfully",
            restoring: "Your trust score has been restored. Redirecting to the application...",
        },

        // New attempt tracking messages
        attemptTracking: {
            attempt: "Attempt {current} of {max}",
            finalAttempt: "Final attempt - permission denial will result in blocking",
            multipleAttemptsAllowed: "Multiple attempts available if permission setup fails",
        },
    },

    // Enhanced gyroscope modal
    gyroscope: {
        title: "GYROSCOPE AUTHENTICATION REQUIRED",
        subtitle: "Your trust score is extremely low. Please complete gyroscope verification to continue.",

        // Enhanced phases
        initializing: "Initializing gyroscope verification...",
        checkingAvailability: "Checking gyroscope availability...",
        permissionRequired: "GYROSCOPE PERMISSION REQUIRED",
        permissionRequested: "PERMISSION REQUEST SENT",
        permissionInstructions: "You need to grant gyroscope access permission to continue",
        grantPermission: "REQUEST PERMISSION",
        checkPermission: "CHECK PERMISSION STATUS",
        checkingPermission: "Checking...",

        // Enhanced movement instructions
        movementInstructions: "Movement Instructions",
        deviceInstructions: "You will need to move your device to complete verification",
        requiredMovements: "Required Movements:",
        movement1: "• Tilt your device left and right (12+ degrees)",
        movement2: "• Tilt your device forward and backward (12+ degrees)",
        movement3: "• Rotate your device clockwise or counterclockwise (12+ degrees)",
        movementCount: "Complete {count} distinct movements within 20 seconds",

        // Enhanced permission instructions
        permissionInstructions2: {
            title: "Permission Setup Instructions:",
            step1: "1. Tap \"Request Permission\" below",
            step2: "2. If prompted, allow motion access in the system dialog",
            step3: "3. If redirected to settings, enable motion & orientation access",
            step4: "4. Return here and tap \"Check Permission Status\" to verify",
            step5: "5. You may need to repeat steps 3-4 up to 3 times if the system doesn't update immediately",
        },

        // Verification
        startVerification: "START VERIFICATION",
        movementsDetected: "Movements Detected",
        moveDevice: "Move your device in different directions",
        startMoving: "Start moving your device...",
        keepMoving: "Keep moving...",
        verificationComplete: "Verification complete!",

        // Enhanced warnings
        important: "Important",
        oneAttempt: "You have only one attempt to complete this verification. Make sure your device can move freely before starting.",
        checkingGyroStatus: "Checking gyroscope status...",
        try: "Try",

        // Enhanced errors
        errors: {
            deviceNotSupported: "Your device does not support gyroscope verification",
            unavailable: "Gyroscope unavailable on this device",
            permissionDenied: "Gyroscope permission was not granted after multiple attempts",
            permissionCheckFailed: "Checking gyroscope permission status...",
            noData: "No gyroscope data detected - please ensure your device supports motion sensing",
            timeout: "Verification timeout - complete movements faster",
            verificationFailed: "Verification failed",
        },

        securityPolicy: "Security Policy",
        securityPolicyText: "Accounts with extremely low trust scores require gyroscope verification. Since your device does not support this feature, your account will be temporarily blocked.",
        unavailableWarning: "Gyroscope verification is unavailable on your device. Your account will be blocked in accordance with security policy.",

        // Updated permission warning
        permissionWarning: "Gyroscope access permission is required to continue. You have multiple attempts to grant permission. Denying permission after all attempts will result in account blocking.",

        // Enhanced block warnings
        blockWarning: "Your account will be blocked for 1 month due to device incompatibility.",
        blockWarningFailed: "Gyroscope verification required due to extremely low trust score. Your account will be blocked for 1 month if verification fails.",
        blockWarningUnavailable: "Your account will be blocked for 1 month as gyroscope is unavailable on the device.",
        blockWarningPermissionDenied: "Your account will be blocked for 1 month due to gyroscope permission denial after multiple attempts.",

        success: {
            title: "ROTATION STOPPED",
            message: "Your identity has been verified successfully",
            restoring: "Your trust score has been restored. Redirecting to the application...",
        },

        // New attempt tracking messages
        attemptTracking: {
            attempt: "Attempt {current} of {max}",
            finalAttempt: "Final attempt - permission denial will result in blocking",
            multipleAttemptsAllowed: "Multiple attempts available if permission setup fails",
        },

        // Enhanced sensitivity settings
        sensitivity: {
            title: "Movement Sensitivity",
            description: "Threshold reduced to 12 degrees for better detection",
            cooldown: "Minimum 0.8 seconds between movements",
            timeout: "Extended to 20 seconds for completion",
        },
    },

    // Enhanced blocked page
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

        // Enhanced block reasons with better explanations
        reasons: {
            failed_captcha: "Failed to complete security challenge verification",
            failed_biometric: "Failed biometric authentication verification",
            failed_gyroscope: "Failed device movement verification",
            device_unsupported_biometric: "Device does not support biometric authentication",
            device_unsupported_gyroscope: "Device does not support gyroscope verification",
            biometric_unavailable: "Biometric authentication unavailable on device",
            gyroscope_unavailable: "Gyroscope verification unavailable on device",
            biometric_permission_denied: "Biometric authentication permission denied after multiple attempts",
            gyroscope_permission_denied: "Gyroscope access permission denied after multiple attempts",
            manual_block: "Account manually blocked by administrator",
            suspicious_activity: "Suspicious activity detected on account",
            abandoned_verification: "Verification was abandoned or left incomplete",
            default: "Security verification required",
        },

        // What happens next
        whatNext: "What happens next?",
        whatNextSteps: [
            "• Your account will be automatically unblocked when the time expires",
            "• You will be redirected to the login page",
            "• Your trust score may be adjusted based on the security verification",
            "• Future verifications may be required if trust score remains low",
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

        // Enhanced appeal contact
        appeal: {
            title: "Think the block was a mistake?",
            subtitle: "If you believe your account was blocked in error or due to technical issues",
            contact: "Contact us:",
            contactLink: "https://t.me/mrmrcrowley",
            contactText: "@mrmrcrowley",
            note: "Note: We review genuine technical issues and erroneous blocks. Include your user ID and detailed description of the problem. Attempts to appeal fair blocks will be ignored.",
            technicalIssues: "Common technical issues: permission dialogs not appearing, device compatibility problems, app crashes during verification.",
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

    // Enhanced common elements
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

        // New common elements
        permissionSetup: "Permission Setup",
        multipleAttempts: "Multiple Attempts Available",
        finalAttempt: "Final Attempt",
        deviceCompatibility: "Device Compatibility",
        systemRequirements: "System Requirements",
        troubleshooting: "Troubleshooting",
    },

    // New troubleshooting section
    troubleshooting: {
        title: "Troubleshooting Guide",
        biometric: {
            title: "Biometric Issues",
            noPermission: "If permission dialog doesn't appear, manually enable biometric access in device settings",
            noSensor: "Verify your device has fingerprint or face recognition capabilities",
            notEnrolled: "Ensure you have set up biometric authentication in device settings",
            appPermissions: "Check app permissions in device settings for biometric access",
        },
        gyroscope: {
            title: "Gyroscope Issues",
            noPermission: "If permission dialog doesn't appear, manually enable motion access in device settings",
            noSensor: "Verify your device has motion sensors (accelerometer/gyroscope)",
            calibration: "Try calibrating your device's motion sensors in device settings",
            sensitivity: "Move device with distinct 12+ degree movements, not small shakes",
        },
        general: {
            title: "General Issues",
            browserCompatibility: "Use latest version of supported browsers (Chrome, Safari, Firefox)",
            connectionIssues: "Ensure stable internet connection during verification",
            appRestart: "Try closing and reopening the application if issues persist",
            deviceRestart: "Restart your device if permission issues continue",
        },
    },
} as const;