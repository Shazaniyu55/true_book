declare module '@sendgrid/mail' {
  export class MailService {
    setApiKey(apiKey: string): void;
    send(message: Record<string, any>): Promise<unknown>;
  }
}

declare module 'mailgun.js' {
  export default class Mailgun {
    constructor(formData: any);
    client(options: { username: string; key: string }): {
      messages: {
        create(domain: string, message: Record<string, any>): Promise<unknown>;
      };
    };
  }
}

declare module 'twilio' {
  namespace Twilio {
    class Twilio {
      verify: any;
    }
  }

  function Twilio(accountSid?: string, authToken?: string): Twilio.Twilio;
  export = Twilio;
}

declare module 'twilio/lib/rest/verify/v2/service/verification' {
  export interface VerificationInstance {
    sid: string;
    status: string;
  }
}
