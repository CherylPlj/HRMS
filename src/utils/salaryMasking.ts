/**
 * Utility functions for masking sensitive salary information
 * Per DPA Philippines compliance requirements
 */

/**
 * Mask salary amount - show only currency symbol and masked digits
 * Format: ₱***,*** or ₱***,***.** for decimal amounts
 */
export function maskSalaryAmount(
  amount: number | string | null | undefined,
  isVisible: boolean = false
): string {
  if (!amount) return 'N/A';
  
  if (isVisible) {
    // Show full amount when visible
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return 'N/A';
    return `₱${numAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  
  // Mask the amount - show structure but hide digits
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return 'N/A';
  
  // Convert to string to determine format
  const formatted = numAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const parts = formatted.split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1] || '';
  
  // Mask integer part but preserve comma structure
  const maskedInteger = integerPart.replace(/\d/g, '*');
  const maskedDecimal = decimalPart.replace(/\d/g, '*');
  
  return `₱${maskedInteger}${maskedDecimal ? '.' + maskedDecimal : ''}`;
}

