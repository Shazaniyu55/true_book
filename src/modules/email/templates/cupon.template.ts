// ─── Welcome Coupon Email ─────────────────────────────────────────────────────

export const welcomeCouponTemplate = (params: {
  firstName: string;
  couponCode: string;
  discountValue: number;
  discountType: string;
  expiresAt?: Date | null;
  description?: string | null;
}): string => {
  const discountLabel =
    params.discountType === 'percentage'
      ? `${params.discountValue}% off`
      : `NGN ${params.discountValue.toLocaleString()} off`;

  const expiryLine = params.expiresAt
    ? `Valid until <strong>${new Date(params.expiresAt).toLocaleDateString('en-NG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })}</strong>.`
    : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Welcome Coupon</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
          <tr>
            <td style="background:#1a1a2e;padding:32px 40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;">Tru Booker</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 12px;color:#1a1a2e;font-size:20px;">🎉 Welcome gift, ${params.firstName}!</h2>
              <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6;">
                ${params.description ?? `As a new Tru Booker member, here's a special discount on your first trip.`}
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="background:#f0fdf4;border-radius:12px;padding:28px;border:2px dashed #22c55e;">
                    <p style="margin:0 0 6px;color:#16a34a;font-size:12px;text-transform:uppercase;letter-spacing:1.5px;">Your Coupon Code</p>
                    <p style="margin:0 0 8px;color:#14532d;font-size:36px;font-weight:800;letter-spacing:6px;">${params.couponCode}</p>
                    <p style="margin:0;color:#22c55e;font-size:16px;font-weight:600;">${discountLabel} on your next booking</p>
                  </td>
                </tr>
              </table>
              ${expiryLine ? `<p style="margin:16px 0 0;color:#9ca3af;font-size:13px;text-align:center;">${expiryLine}</p>` : ''}
              <p style="margin:24px 0 0;color:#6b7280;font-size:13px;line-height:1.6;">
                Simply enter the code above at checkout when booking your next trip. 
                One use per account.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">© ${new Date().getFullYear()} Tru Booker. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
};

// ─── Referral Reward Email ────────────────────────────────────────────────────

export const referralRewardTemplate = (params: {
  firstName: string;
  couponCode: string;
  rewardValue: number;
  rewardType: 'flat' | 'percentage';
  expiresAt?: Date | null;
  qualifiedCount: number;
}): string => {
  const rewardLabel =
    params.rewardType === 'percentage'
      ? `${params.rewardValue}% off`
      : `NGN ${params.rewardValue.toLocaleString()} off`;

  const expiryLine = params.expiresAt
    ? `Valid until <strong>${new Date(params.expiresAt).toLocaleDateString('en-NG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })}</strong>.`
    : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Referral Reward</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
          <tr>
            <td style="background:#1a1a2e;padding:32px 40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;">Tru Booker</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 12px;color:#1a1a2e;font-size:20px;">🏆 Referral milestone reached!</h2>
              <p style="margin:0 0 8px;color:#374151;font-size:16px;">Hi <strong>${params.firstName}</strong>,</p>
              <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6;">
                You've successfully referred <strong>${params.qualifiedCount} passengers</strong> to Tru Booker. 
                You've earned a reward — here's your discount coupon!
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="background:#fffbeb;border-radius:12px;padding:28px;border:2px dashed #f59e0b;">
                    <p style="margin:0 0 6px;color:#d97706;font-size:12px;text-transform:uppercase;letter-spacing:1.5px;">Your Reward Code</p>
                    <p style="margin:0 0 8px;color:#92400e;font-size:36px;font-weight:800;letter-spacing:6px;">${params.couponCode}</p>
                    <p style="margin:0;color:#f59e0b;font-size:16px;font-weight:600;">${rewardLabel} on your next booking</p>
                  </td>
                </tr>
              </table>
              ${expiryLine ? `<p style="margin:16px 0 0;color:#9ca3af;font-size:13px;text-align:center;">${expiryLine}</p>` : ''}
              <p style="margin:24px 0 0;color:#6b7280;font-size:13px;line-height:1.6;">
                Keep referring friends to keep earning rewards. Share your referral code: 
                <strong>${params.qualifiedCount}</strong> qualified referrals so far — keep it up!
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">© ${new Date().getFullYear()} Tru Booker. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
};