export function formatToCurrency(amount: number, locale = 'en-NG', currency = 'NGN'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
}
