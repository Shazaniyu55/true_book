// Function to format a number into a local exchange
export function formatToCurrency(amount, locale = 'en-NG', currency = 'NGN') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  }).format(amount);
}
