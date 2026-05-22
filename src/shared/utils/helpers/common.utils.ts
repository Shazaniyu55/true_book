export function isOtpExpired(expiresAt: Date): boolean {
  return new Date() > new Date(expiresAt);
}

export function getOtpExpiry(durationMinutes = 10): Date {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + durationMinutes);
  return expiry;
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  return `${local.slice(0, 2)}***@${domain}`;
}

export function maskPhone(phone: string): string {
  return phone.slice(0, 4) + '****' + phone.slice(-3);
}
