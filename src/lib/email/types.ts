export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface EmailTemplateData {
  // User data
  userName?: string;
  userEmail?: string;
  
  // OTP data
  otp?: string;
  otpExpiryMinutes?: number;
  
  // Order data
  orderId?: string;
  orderTotal?: number;
  orderItems?: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  orderDate?: string;
  deliveryAddress?: string;
  pickupCode?: string;
  
  // Payment data
  paymentMethod?: string;
  transactionId?: string;
  
  // Tracking data
  trackingNumber?: string;
  estimatedDelivery?: string;
  
  // Company data
  companyName?: string;
  companyLogo?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyAddress?: string;
  websiteUrl?: string;

  // Marketing campaign
  campaignTitle?: string;
  campaignBody?: string;
  ctaText?: string;
  ctaUrl?: string;
  bannerImageUrl?: string;
  discountCode?: string;

  // Abandoned cart
  cartItems?: Array<{
    name: string;
    quantity: number;
    price: number;
    image?: string;
  }>;
  restoreCartUrl?: string;
  minutesSinceAbandoned?: number;

  // Internal notifications
  orderType?: 'delivery' | 'pickup';
}

export const EMAIL_TEMPLATES = {
  // 1. Email OTP Verification
  EMAIL_OTP_VERIFICATION: 'email_otp_verification',
  
  // 2. Welcome Email
  WELCOME_EMAIL: 'welcome_email',
  
  // 3. Order Placed
  ORDER_PLACED: 'order_placed',
  
  // 4. Payment Confirmed
  PAYMENT_CONFIRMED: 'payment_confirmed',

  // 4b. Payment Failed
  PAYMENT_FAILED: 'payment_failed',

  // 4c. Payment Pending/Under Process
  PAYMENT_PENDING: 'payment_pending',
  
  // 5. Shipping Notification
  SHIPPING_NOTIFICATION: 'shipping_notification',
  
  // 6. Ready for Pickup
  READY_FOR_PICKUP: 'ready_for_pickup',
  
  // 7. Order Completed
  ORDER_COMPLETED: 'order_completed',

  // 7b. Order Delivered
  ORDER_DELIVERED: 'order_delivered',
  
  // 8. Password Reset OTP
  PASSWORD_RESET_OTP: 'password_reset_otp',
  
  // 9. Email Change OTP
  EMAIL_CHANGE_OTP: 'email_change_otp',

  // 10. Marketing Campaign
  MARKETING_CAMPAIGN: 'marketing_campaign',

  // 11. Abandoned Cart Reminder
  ABANDONED_CART: 'abandoned_cart',

  // 12. Internal order notifications
  ORDER_NOTIFICATION_MANAGER: 'order_notification_manager',
  ORDER_NOTIFICATION_SALES_PICKUP: 'order_notification_sales_pickup'
} as const;

export type EmailTemplateType = typeof EMAIL_TEMPLATES[keyof typeof EMAIL_TEMPLATES];
