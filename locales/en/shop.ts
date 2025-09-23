// src/locales/ru/shop.ts - Updated Shop and purchases with TON Shop localization

export const shop = {
  title: "SHOP",
  subtitle: "Welcome to Pyaterochka",
  buyForStars: "Buy with stars",
  paymentMethods: "TON",
  payWithTON: "TON",
  tonDescription: "<3",
  openTONShop: "Open",
  goToTONShop: "Go to the TON shop",
  payWithStars: "Telegram Stars",
  starsDescription: "Mmm, stars",
  moreAttempts: "More Attempts",
  description: "Get 1 extra game attempt",
  features: "Features",
  benefits: [
    "Play another game",
    "Instant activation",
    "No expiration date",
  ],
  price: "{price} Telegram Stars",
  purchase: "BUY FOR {price} ⭐",
  creatingInvoice: "CREATING AN INVOICE...",
  processingPayment: "PROCESSING PAYMENT...",
  purchaseSuccessful: "Purchase Successful!",
  purchaseFailed: "Purchase Failed",
  attemptAdded: "+1 attempt added to your account",
  paymentInfo: "Payment Information",
  purchaseSuccess: "Purchase Successful!",
  purchaseSuccessMessage: "Oops, attempts: +{attempts}",
  instantResetSuccess: "Attempts Recovered!",
  instantResetMessage: "Your attempts have been recovered and the timer has been reset",
  support: "Support",
  supportContact: "For questions, please contact:",
  supportLink: "https://t.me/circuslecommunity",
  paymentDetails: [
    "• Payments are processed via Telegram Stars",
    "• Attempts are added instantly after payment",
    "• Secure payment via Telegram",
    "• No limit on the number of attempts",
    "• No regular payments",
  ],

  Products: {
    attempts1: {
      title: "+1 Attempt",
      description: "Get 1 extra game attempt",
    },
    attempts5: {
      title: "+5 Attempts",
      description: "Get 5 extra game attempts",
    },
    attempts10: {
      title: "+10 Attempts",
      description: "Get 10 extra game attempts",
    },
    attempts100: {
      title: "+100 Attempts",
      description: "Get 100 extra game attempts",
    },
    instantReset: {
      title: "Instant Reset",
      description: "Instantly restore 10 attempts and reset the timer",
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
    purchaseSuccessMessage: "{attempts} {plural} attempts added to your account",
    instantResetSuccess: "Attempts Recovered!",
    instantResetMessage: "Your attempts have been recovered and the timer has been reset",
  },

  // TON Shop-specific localization
  tonShop: {
    title: "TON Shop",
    subtitle: "Purchase game attempts with TON cryptocurrency",
    loading: "Loading TON Shop...",

    errors: {
      missingAuthData:
        "Missing authentication data. Please open this page through the main app.",
      invalidAuthData: "Invalid authentication data",
      initializationFailed: "Failed to initialize the store",
      loadingError: "Error loading store",
      orderCreationFailed: "Failed to create an order",
      walletNotConnected: "Wallet not connected",
      invalidOrderData: "Invalid order data",
      transactionCancelled: "Transaction canceled by user",
      insufficientBalance: "Insufficient TON in the wallet balance",
      transactionFailed:
        "Failed to send the transaction. Please try again.",
      statusCheckFailed: "Failed to check the order status",
      timeoutExpired:
        "Timeout expired. Please check the transaction status manually.",
      authDataUnavailable: "Failed to retrieve Telegram authentication data.",
      openingFailed: "Failed to open the TON store.",
    },

    wallet: {
      connected: "Wallet connected",
      connectRequired: "Connect your wallet to make purchases",
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
      paymentSuccessful: "Payment successfully completed!",
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
      corporateWallet: "Here are all transactions",
    },

    badges: {
      popular: "d46351ba",
      bestValue: "333607e13db3",
      ultimate: "3ff954c06925",
    },

    products: {
      attempts_1: {
        title: "+1 Attempt",
        description: "Get 1 extra game attempt",
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
        "Open the TON store to purchase game attempts with TON cryptocurrency",
    },
  },
} as const;