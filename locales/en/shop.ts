// src/locales/en/shop.ts - Shop and purchases

export const shop = {
  title: "SHOP",
  subtitle: "Purchase additional game attempts",
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
  purchaseSuccessMessage: "{attempts} attempt{plural} added to your account",
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
    test: "Test",
    popular: "Popular",
    bestvalue: "Best Value",
    ultimate: "Ultimate",
    instant: "Instant",
  },
  testProduct: {
    title: "Test Product",
    description: "Visual effects demonstration",
    button: "Test Effects",
  },
  buy: "Buy",
  loading: "Loading...",
  notifications: {
    purchaseSuccess: "Purchase Successful!",
    purchaseSuccessMessage: "{attempts} attempt{plural} added to your account",
    instantResetSuccess: "Attempts Restored!",
    instantResetMessage: "Your attempts have been restored and timer reset",
  },
} as const;
