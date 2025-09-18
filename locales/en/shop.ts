// src/locales/en/shop.ts - Shop and purchases with TON Shop localization

export const shop = {
  title: "SHOP",
  subtitle: "Purchase additional game attempts",
  paymentMethods: "TON",
  payWithTON: "TON",
  tonDescription: "Yay",
  openTONShop: "TON",
  payWithStars: "Telegram Stars",
  starsDescription: "Staaaaaars mmmm",
  moreAttempts: "More Attempts",
  description: "Get 1 additional game attempt",
  features: "Features",
  benefits: ["Play one more game", "Instant activation", "No expiration date"],
  price: "{price} Telegram Stars",
  purchase: "BUY FOR {price} ⭐",
  creatingInvoice: "CREATING INVOICE...",
  processingPayment: "PROCESSING PAYMENT...",
  purchaseSuccessful: "Purchase Successful!",
  purchaseFailed: "Purchase Failed",
  attemptAdded: "+1 attempt added to your account",
  paymentInfo: "Payment Information",
  purchaseSuccess: "Purchase Successful!",
  purchaseSuccessMessage: "Yay! Attempts: +{attempts}",
  instantResetSuccess: "Attempts Restored!",
  instantResetMessage: "Your attempts have been restored and timer reset",
  support: "Support",
  supportContact: "For refund inquiries contact:",
  supportLink: "https://t.me/mrmrcrowley",
  paymentDetails: [
    "• Payments processed through Telegram Stars",
    "• Attempts added instantly after payment",
    "• Secure payment through Telegram",
    "• No limit on number of attempts",
    "• No recurring charges",
  ],
  products: {
    attempts1: {
      title: "+1 Attempt",
      description: "Get 1 additional game attempt",
    },
    attempts5: {
      title: "+5 Attempts",
      description: "Get 5 additional game attempts",
    },
    attempts10: {
      title: "+10 Attempts",
      description: "Get 10 additional game attempts",
    },
    attempts100: {
      title: "+100 Attempts",
      description: "Get 100 additional game attempts",
    },
    instantReset: {
      title: "Instant Reset",
      description: "Instantly restore 10 attempts and reset cooldown",
    },
  },
  badges: {
    popular: "d46351ba",
    bestValue: "333607e13db3",
    ultimate: "3ff954c06925",
    instant: "Instant",
  },
  buy: "Buy",
  loading: "Loading...",
  notifications: {
    purchaseSuccess: "Purchase Successful!",
    purchaseSuccessMessage: "{attempts} attempt{plural} added to your account",
    instantResetSuccess: "Attempts Restored!",
    instantResetMessage: "Your attempts have been restored and timer reset",
  },

  // TON Shop specific localization
  tonShop: {
    title: "TON Shop",
    subtitle: "Purchase game attempts with TON cryptocurrency",
    loading: "Loading TON Shop...",

    errors: {
      missingAuthData:
        "Authentication data missing. Please open this page through the main application.",
      invalidAuthData: "Invalid authentication data",
      initializationFailed: "Failed to initialize shop",
      loadingError: "Shop Loading Error",
      orderCreationFailed: "Failed to create order",
      walletNotConnected: "Wallet not connected",
      invalidOrderData: "Invalid order data",
      transactionCancelled: "Transaction cancelled by user",
      insufficientBalance: "Insufficient TON balance in wallet",
      transactionFailed: "Failed to send transaction. Please try again.",
      statusCheckFailed: "Failed to check order status",
      timeoutExpired:
        "Timeout expired. Please check transaction status manually.",
      authDataUnavailable: "Unable to get Telegram authentication data",
      openingFailed: "Failed to open TON Shop",
    },

    wallet: {
      connected: "Wallet Connected",
      connectRequired: "Connect wallet to make purchases",
    },

    user: {
      greeting: "Welcome, {name}!",
    },

    status: {
      creatingOrder: "Creating order...",
      preparingPurchase: "Preparing your purchase",
      processingPayment: "Processing payment...",
      processingTime:
        "Your transaction is being processed. This may take up to 5 minutes.",
      paymentSuccessful: "Payment successful!",
      attemptsAdded: "Your attempts have been added to your account.",
      paymentError: "Payment error",
    },

    actions: {
      newPurchase: "New Purchase",
      tryAgain: "Try Again",
      processing: "Processing...",
      buyWithTON: "Buy with TON",
      opening: "Opening...",
    },

    info: {
      processingTime: "Payments are processed automatically within 5 minutes",
      safeToClose: "You can safely close this page after payment",
      attemptsVisible:
        "Attempts will be visible in the main app after processing",
      corporateWallet: "All transactions here",
    },

    badges: {
      popular: "d46351ba",
      bestValue: "333607e13db3",
      ultimate: "3ff954c06925",
    },

    products: {
      attempts_1: {
        title: "+1 Attempt",
        description: "Get 1 additional game attempt",
      },
      attempts_5: {
        title: "+5 Attempts",
        description: "Get 5 additional game attempts",
      },
      attempts_10: {
        title: "+10 Attempts",
        description: "Get 10 additional game attempts",
      },
      attempts_100: {
        title: "+100 Attempts",
        description: "Get 100 additional game attempts",
      },
    },

    button: {
      tooltip:
        "Open TON Shop to purchase game attempts with TON cryptocurrency",
    },
  },
} as const;
