// ─── Contact Support Email Templates ─────────────────────────────────────────

export function contactSupportReceivedTemplate(params: {
  name: string;
  subject: string;
  message: string;
  contactId: string;
  userType: string;
}): string {
  return `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px;">
          <h2 style="color: #1a1a1a;">New Support Request Received</h2>
          <p style="color: #555;">A new contact support request has been submitted.</p>
          
          <div style="background: #f9f9f9; border-left: 4px solid #f97316; padding: 16px; margin: 20px 0; border-radius: 4px;">
            <p><strong>Ticket ID:</strong> ${params.contactId}</p>
            <p><strong>Name:</strong> ${params.name}</p>
            <p><strong>User Type:</strong> ${params.userType}</p>
            <p><strong>Subject:</strong> ${params.subject}</p>
            <p><strong>Message:</strong></p>
            <p style="color: #333;">${params.message}</p>
          </div>

          <p style="color: #888; font-size: 12px;">This is an automated notification from Tru Booker Support.</p>
        </div>
      </body>
    </html>
  `;
}

export function contactSupportAckTemplate(params: {
  name: string;
  subject: string;
  contactId: string;
}): string {
  return `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px;">
          <h2 style="color: #1a1a1a;">We've received your message, ${params.name}!</h2>
          <p style="color: #555;">Thank you for reaching out to Tru Booker support. We've received your request and our team will get back to you shortly.</p>

          <div style="background: #f9f9f9; border-left: 4px solid #f97316; padding: 16px; margin: 20px 0; border-radius: 4px;">
            <p><strong>Ticket ID:</strong> ${params.contactId}</p>
            <p><strong>Subject:</strong> ${params.subject}</p>
          </div>

          <p style="color: #555;">Our typical response time is <strong>24–48 hours</strong>. If your issue is urgent, please reply to this email.</p>
          <p style="color: #888; font-size: 12px;">© Tru Booker. All rights reserved.</p>
        </div>
      </body>
    </html>
  `;
}