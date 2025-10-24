/**
 * Utility functions for order ID formatting and display
 */

/**
 * Converts a UUID order ID to a short, human-readable order number
 * Format: TB + 4 random alphanumeric characters (e.g., TB7K9M)
 */
export function formatOrderNumber(orderId: string): string {
  if (!orderId || typeof orderId !== 'string') {
    return 'TB0000';
  }

  // Remove hyphens and take first 4 characters, convert to uppercase
  const cleanId = orderId.replace(/-/g, '').toUpperCase();
  const shortCode = cleanId.slice(0, 4);
  
  return `TB${shortCode}`;
}

/**
 * Converts a UUID order ID to a medium-length order number
 * Format: TB + 6 random alphanumeric characters (e.g., TB7K9M3X)
 */
export function formatOrderNumberMedium(orderId: string): string {
  if (!orderId || typeof orderId !== 'string') {
    return 'TB000000';
  }

  // Remove hyphens and take first 6 characters, convert to uppercase
  const cleanId = orderId.replace(/-/g, '').toUpperCase();
  const shortCode = cleanId.slice(0, 6);
  
  return `TB${shortCode}`;
}

/**
 * Legacy function for backward compatibility - formats to 8-character display
 */
export function formatOrderId(orderId: string): string {
  if (!orderId || typeof orderId !== 'string') {
    return '00000000';
  }
  
  return orderId.slice(0, 8).toUpperCase();
}

/**
 * Get a human-readable order display text
 */
export function getOrderDisplayText(orderId: string): string {
  return `Order #${formatOrderNumber(orderId)}`;
}