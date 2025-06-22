// src/locales/en/tasks.ts - Tasks and challenges system

export const tasks = {
    // Main elements
    title: "TASKS",
    subtitle: "Complete tasks to earn extra attempts",
    loading: "Loading",

    // Buttons and statuses
    start: "START",
    checking: "CHECKING...",
    claim: "CLAIM",
    completed: "COMPLETED",
    subscribe: "SUBSCRIBE",
    visit: "VISIT",
    follow: "FOLLOW",
    repost: "REPOST",
    share: "SHARE",

    // Wait statuses
    waitSeconds: "Wait {seconds}s",
    waitMinutes: "Wait {minutes}m",
    verifying: "Verifying...",

    // Rewards
    reward: "Attempts:",

    // Sections
    sections: {
        story: "Special Task",
        active: "Active Tasks",
        completed: "Completed Tasks"
    },

    // Task types
    types: {
        telegram_channel: "Subscribe",
        telegram_chat: "Join Chat",
        twitter_follow: "Follow",
        twitter_repost: "Repost",
        website_visit: "Visit",
        story_share: "Share Story"
    },

    // Error messages
    errors: {
        notSubscribed: "You are not subscribed to this channel/chat",
        taskNotFound: "Task not found",
        alreadyCompleted: "Task already completed",
        cooldownActive: "Task is on cooldown",
        verificationFailed: "Verification failed, please try again",
        rewardClaimFailed: "Failed to claim reward",
        unknownError: "An unknown error occurred"
    },

    // Success messages
    success: {
        taskStarted: "Task started successfully",
        taskCompleted: "Task completed successfully",
        rewardClaimed: "Reward claimed! +{count} attempts added",
        subscriptionVerified: "Subscription verified successfully"
    },

    // Task descriptions
    descriptions: {
        telegram_channel: "Subscribe to channel",
        telegram_chat: "Join chat",
        twitter_follow: "Follow on Twitter",
        twitter_repost: "Repost tweet",
        website_visit: "Visit website",
        story_share: "Share to your Telegram Story"
    },

    // Special task
    storyTask: {
        title: "Share to Story",
        description: "Share the game in your Telegram story every 2 hours",
        cooldownText: "Available again in {time}",
        notSupported: "Story sharing is not supported in this version"
    },

    // Empty states
    empty: {
        noActiveTasks: "No active tasks available",
        noCompletedTasks: "No completed tasks yet",
        startCompleting: "Start completing tasks to earn attempts!"
    },

    // Information messages
    info: {
        telegramVerification: "Subscription will be verified automatically",
        trustVerification: "Task completion verified on trust basis",
        completionDelay: "Please wait {seconds} seconds for verification"
    }
} as const;