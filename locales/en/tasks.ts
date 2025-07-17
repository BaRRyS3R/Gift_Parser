// src/locales/en/tasks.ts - English translations for tasks

export const tasks = {
    title: "Tasks",
    subtitle: "Complete tasks to earn attempts",
    loading: "Loading tasks...",
    loadingTasks: "Loading tasks...",
    noTasks: "No tasks available",
    noTasksDescription: "Check back later for new tasks",
    failedToLoad: "Failed to load tasks",
    authenticationRequired: "Authentication required to view tasks",

    // Task actions
    complete: "Complete",
    completed: "Completed",
    completeTask: "Complete Task",
    verify: "Verify",
    verifying: "Verifying...",
    completing: "Completing...",
    openLink: "Open Link",
    visitWebsite: "Visit Website",
    joinChannel: "Join Channel",
    followAccount: "Follow Account",
    shareStory: "Share Story",

    // Task types
    types: {
        telegramChannel: "Telegram Channel",
        telegramChannelDesc: "Subscribe to Telegram channel",
        telegramChat: "Telegram Chat",
        telegramChatDesc: "Join Telegram chat",
        twitterFollow: "Twitter Follow",
        twitterFollowDesc: "Follow account on Twitter",
        twitterRepost: "Twitter Repost",
        twitterRepostDesc: "Repost on Twitter",
        visitWebsite: "Visit Website",
        visitWebsiteDesc: "Visit website",
        telegramStory: "Telegram Story",
        telegramStoryDesc: "Share in Telegram Stories",
    },

    // Task status
    status: {
        available: "Available",
        completed: "Completed",
        expired: "Expired",
        pending: "Pending",
        verified: "Verified",
        failed: "Failed",
    },

    // Rewards
    rewards: {
        attempts: "attempts",
        attempt: "attempt",
        earn: "Earn",
        earned: "Earned",
        reward: "Reward",
        totalEarned: "Total Earned",
    },

    // Statistics
    stats: {
        totalTasks: "Total Tasks",
        completedTasks: "Completed Tasks",
        completionRate: "Completion Rate",
        totalAttemptsEarned: "Total Attempts Earned",
    },

    // Messages
    messages: {
        taskCompleted: "Task completed successfully!",
        taskCompletedDesc: "You have earned {attempts} {plural}",
        taskFailed: "Task completion failed",
        taskFailedDesc: "Please try again",
        verificationRequired: "Verification required",
        verificationRequiredDesc: "Please complete the required action first",
        verificationSuccess: "Verification successful",
        verificationSuccessDesc: "Task has been verified successfully",
        verificationFailed: "Verification failed",
        verificationFailedDesc: "Please complete the required action and try again",
        alreadyCompleted: "Task already completed",
        alreadyCompletedDesc: "You have already completed this task",
        taskNotFound: "Task not found",
        taskNotFoundDesc: "The requested task could not be found",
        confirmCompletion: "Are you sure you want to complete this task?",
        confirmCompletionDesc: "You will earn {attempts} {plural}",
    },

    // Notifications
    notifications: {
        taskSuccess: "Task Completed!",
        taskSuccessMessage: "You earned {attempts} {plural}!",
        verificationSuccess: "Verification Successful!",
        verificationSuccessMessage: "Task has been verified and completed",
        taskError: "Task Error",
        taskErrorMessage: "Failed to complete task. Please try again.",
        verificationError: "Verification Error",
        verificationErrorMessage: "Failed to verify task. Please try again.",
    },

    // Instructions
    instructions: {
        telegramChannel: "Join the Telegram channel using the link below, then click Complete to verify your subscription",
        telegramChat: "Join the Telegram chat using the link below, then click Complete to verify your membership",
        twitterFollow: "Follow the Twitter account using the link below, then click Complete to verify your subscription",
        twitterRepost: "Repost the Twitter post using the link below, then click Complete to verify your repost",
        visitWebsite: "Visit the website using the link below, then click Complete to earn your reward",
        telegramStory: "Share the content to your Telegram Stories using the link below, then click Complete to verify your post",
        general: "Complete the required action using the link below, then click Complete to earn your reward",
    },

    // Error messages
    errors: {
        taskNotFound: "Task not found",
        alreadyCompleted: "Task already completed",
        verificationFailed: "Verification failed",
        completionFailed: "Task completion failed",
        networkError: "Network error occurred",
        unknownError: "An unknown error occurred",
        authenticationError: "Authentication error",
        permissionDenied: "Permission denied",
        taskExpired: "Task has expired",
        invalidRequest: "Invalid request",
        serverError: "Server error occurred",
    },

    // Buttons
    buttons: {
        complete: "Complete",
        completed: "Completed",
        verify: "Verify",
        verifying: "Verifying...",
        completing: "Completing...",
        openLink: "Open Link",
        tryAgain: "Try Again",
        refresh: "Refresh",
        goBack: "Go Back",
        close: "Close",
        confirm: "Confirm",
        cancel: "Cancel",
    },

    // Badges
    badges: {
        new: "New",
        popular: "Popular",
        limited: "Limited",
        exclusive: "Exclusive",
        bonus: "Bonus",
        featured: "Featured",
    },
} as const;