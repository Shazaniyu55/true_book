export const welcomeEmailTemplate = (params: {
  firstName: string;
  role: string;
  loginUrl?: string;
}): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to Tru Booker</title>
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
              <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:22px;">Welcome aboard, ${params.firstName}!</h2>
              <p style="margin:0 0 16px;color:#6b7280;font-size:14px;line-height:1.7;">
                Your <strong>${params.role}</strong> account has been created. You're now part of the Tru Booker community — 
                Nigeria's smartest intercity travel platform.
              </p>
              <p style="margin:0 0 28px;color:#6b7280;font-size:14px;line-height:1.7;">
                Here's what you can do next:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="padding:12px;background:#f0f4ff;border-radius:8px;border-left:4px solid #4f46e5;">
                    <p style="margin:0;color:#374151;font-size:14px;">Verify your email with the OTP sent in a separate email</p>
                  </td>
                </tr>
                <tr><td style="height:8px;"></td></tr>
                <tr>
                  <td style="padding:12px;background:#f0fdf4;border-radius:8px;border-left:4px solid #22c55e;">
                    <p style="margin:0;color:#374151;font-size:14px;">📱 Download the Tru Booker app to get started</p>
                  </td>
                </tr>
              </table>
              ${params.loginUrl ? `
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${params.loginUrl}" style="display:inline-block;background:#1a1a2e;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:14px;font-weight:600;">
                      Go to Dashboard
                    </a>
                  </td>
                </tr>
              </table>` : ''}
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