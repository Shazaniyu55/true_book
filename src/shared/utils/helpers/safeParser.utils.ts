export function safeJsonParse(input: string | undefined): any {
  if (typeof input === 'undefined' || input === null) {
    return '';
  }
  try {
    return JSON.parse(input);
  } catch (error) {
    console.error('Invalid JSON:', error);
    return '';
  }
}
