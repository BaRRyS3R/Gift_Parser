// src/locales/en/tasks.ts - Updated Tasks localization for complete system

export const tasks = {
    // Main elements
    title: "TASKS",
    subtitle: "Complete tasks to earn extra attempts",
    loading: "Loading tasks...",
    refresh: "Refresh",

    // Button states and actions
    start: "START",
    checking: "CHECK",
    claim: "CLAIM",
    completed: "COMPLETED",
    subscribe: "SUBSCRIBE",
    visit: "VISIT",
    follow: "FOLLOW",
    repost: "REPOST",
    share: "SHARE",
    join: "JOIN",

    // Status indicators
    waitSeconds: "Wait {seconds}s",
    waitMinutes: "Wait {minutes}m",
    verifying: "Verifying...",
    inProgress: "In Progress",
    readyToClaim: "Ready to Claim",

    // Rewards
    reward: "attempts",
    attemptsReward: "+{count} attempts",

    // Sections and categories
    sections: {
        active: "Active Tasks",
        completed: "Completed Tasks",
        all: "All Tasks",
        available: "Available",
        pending: "Pending",
        finished: "Finished"
    },

    // Task type badges and labels
    badges: {
        telegram: "Telegram",
        twitter: "Twitter",
        website: "Website",
        social: "Social",
        verification: "Auto-verify",
        trust: "Trust-based"
    },

    // Task types with action descriptions
    types: {
        telegram_channel: "Subscribe to Channel",
        telegram_chat: "Join Chat",
        twitter_follow: "Follow Account",
        twitter_repost: "Repost Tweet",
        website_visit: "Visit Website"
    },

    // Action buttons for different task types
    actions: {
        telegram_channel: "Subscribe",
        telegram_chat: "Join",
        twitter_follow: "Follow",
        twitter_repost: "Repost",
        website_visit: "Visit Site"
    },

    // Error messages
    errors: {
        notSubscribed: "You are not subscribed to this channel or chat",
        taskNotFound: "Task not found or no longer available",
        alreadyCompleted: "This task has already been completed",
        alreadyRewarded: "Reward has already been claimed for this task",
        cooldownActive: "Task is on cooldown, please wait",
        verificationFailed: "Verification failed, please try again",
        rewardClaimFailed: "Failed to claim reward, please try again",
        userNotFound: "User account not found",
        unauthorizedAccess: "You are not authorized to perform this action",
        networkError: "Network error, please check your connection",
        serverError: "Server error, please try again later",
        invalidTaskState: "Task is not in the correct state for this action",
        telegramVerificationError: "Telegram verification failed, please ensure you are subscribed",
        unknownError: "An unexpected error occurred"
    },

    // Success messages
    success: {
        taskStarted: "Task Started!",
        taskStartedMessage: "You have successfully started the task: {title}",
        taskCompleted: "Task Completed!",
        taskCompletedMessage: "Great job! You completed: {title}",
        rewardClaimed: "Reward Claimed!",
        rewardClaimedMessage: "You earned +{count} attempts from {title}!",
        subscriptionVerified: "Subscription verified successfully",
        actionCompleted: "Action completed successfully"
    },

    // Task descriptions and instructions
    descriptions: {
        telegram_channel: "Subscribe to the Telegram channel and stay updated",
        telegram_chat: "Join the Telegram chat and become part of the community",
        twitter_follow: "Follow the account on Twitter for latest updates",
        twitter_repost: "Repost the tweet to help spread the word",
        website_visit: "Visit the website to explore and learn more"
    },

    // Instructions for users
    instructions: {
        telegram_channel: "Click Subscribe to open Telegram, then return to verify",
        telegram_chat: "Click Join to open Telegram, then return to verify",
        twitter_follow: "Click Follow to open Twitter, then return to complete",
        twitter_repost: "Click Repost to open Twitter, then return to complete",
        website_visit: "Click Visit to open the website, then return to complete",
        verification_wait: "After completing the action, click Check to verify",
        trust_based: "Complete the action, then click to confirm",
        auto_verify: "Completion will be verified automatically"
    },

    // Empty states
    empty: {
        noActiveTasks: "No active tasks available",
        noCompletedTasks: "No completed tasks yet",
        noPendingTasks: "No pending tasks",
        startCompleting: "Start completing tasks to earn attempts!",
        allTasksCompleted: "Congratulations! You've completed all available tasks",
        checkBackLater: "Check back later for new tasks"
    },

    // Information and help messages
    info: {
        telegramVerification: "Telegram subscriptions are verified automatically",
        trustVerification: "Task completion is verified based on user confirmation",
        completionDelay: "Please wait {seconds} seconds before verification",
        automaticCheck: "We'll automatically check your subscription status",
        manualConfirmation: "Please confirm that you completed the required action",
        rewardInfo: "Complete tasks to earn extra game attempts",
        taskProgress: "Track your progress in the Completed tab"
    },

    // Statistics and progress
    stats: {
        totalTasks: "Total Tasks",
        completedTasks: "Completed",
        pendingTasks: "Pending",
        earnedAttempts: "Attempts Earned",
        completionRate: "Completion Rate",
        progress: "Progress: {completed}/{total}",
        attemptsFromTasks: "Attempts from Tasks: {count}"
    },

    // Timing and cooldowns
    timing: {
        justNow: "Just now",
        secondsAgo: "{seconds}s ago",
        minutesAgo: "{minutes}m ago",
        hoursAgo: "{hours}h ago",
        daysAgo: "{days}d ago",
        cooldownRemaining: "Available in {time}",
        verificationTimeout: "Verification timed out",
        processingTime: "This may take a few moments"
    },

    // Special features
    special: {
        dailyTask: "Daily Task",
        weeklyTask: "Weekly Task",
        limitedTime: "Limited Time",
        highReward: "High Reward",
        easyTask: "Quick Task",
        bonusReward: "Bonus Reward Available"
    }
} as const;