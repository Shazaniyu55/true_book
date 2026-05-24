export const passwordResetTemplate = (params: {
  firstName: string;
  otp: string;
  expiryMinutes: number;
}): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset Your Password</title>
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
              <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:20px;">Password Reset Request</h2>
              <p style="margin:0 0 8px;color:#374151;font-size:14px;">Hi <strong>${params.firstName}</strong>,</p>
              <p style="margin:0 0 28px;color:#6b7280;font-size:14px;line-height:1.6;">
                We received a request to reset your password. Use the code below. 
                It expires in <strong>${params.expiryMinutes} minutes</strong>.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="background:#fff7ed;border-radius:10px;padding:24px;border:1px solid #fed7aa;">
                    <p style="margin:0 0 6px;color:#9a3412;font-size:12px;text-transform:uppercase;letter-spacing:1.5px;">Reset Code</p>
                    <p style="margin:0;color:#7c2d12;font-size:40px;font-weight:800;letter-spacing:12px;">${params.otp}</p>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;color:#9ca3af;font-size:12px;line-height:1.6;">
                If you didn't request this, your account is safe — you can ignore this email. 
                This link will expire in ${params.expiryMinutes} minutes.
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