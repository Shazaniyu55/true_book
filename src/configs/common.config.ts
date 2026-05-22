import { registerAs } from '@nestjs/config';

const toNumber = (value?: string, fallback?: number): number | undefined => {
  if (value === undefined || value === '') return fallback;
  const parsedValue = Number(value);
  return Number.isNaN(parsedValue) ? fallback : parsedValue;
};

export default registerAs('common', () => ({
  port: process.env.PORT,
  appName: process.env.APP_NAME,
  appHostName: process.env.APP_HOSTNAME,
  nodeEnv: process.env.NODE_ENV,
  swaggerApiRoot: process.env.SWAGGER_API_ROOT,
  corsWhitelist: process.env.CORS_WHITELIST,

  auth: {
    jwt: {
      accessSecret: process.env.JWT_ACCESS_SECRET,
      refreshSecret: process.env.JWT_REFRESH_SECRET,
      accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN,
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
    },
  },

  otp: {
    durationMinutes: toNumber(process.env.OTP_DURATION_MINUTES, 10),
  },

  payment: {
    gateway: process.env.PAYMENT_GATEWAY || 'paystack',
    paystack: {
      baseUrl: process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co',
      secretKey: process.env.PAYSTACK_SECRET_KEY,
      publicKey: process.env.PAYSTACK_PUBLIC_KEY,
    },
    flutterwave: {
      publicKey: process.env.FLW_PUBLIC_KEY,
      secretKey: process.env.FLW_SECRET_KEY,
      encryptionKey: process.env.FLW_ENCRYPTION_KEY,
    },
  },

  kyc: {
    dojah: {
      baseUrl: process.env.DOJAH_BASE_URL || 'https://api.dojah.io',
      appId: process.env.DOJAH_APP_ID,
      privateKey: process.env.DOJAH_PRIVATE_KEY,
      publicKey: process.env.DOJAH_PUBLIC_KEY,
    },
  },

  database: {
    type: process.env.DATABASE_TYPE,
    host: process.env.DB_HOST,
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    port: toNumber(process.env.DB_PORT),
    logging: process.env.DATABASE_LOGGING,
    retryAttempts: toNumber(process.env.DATABASE_RETRY_ATTEMPTS),
  },

  runtime: {
    home: process.env.HOME,
    hostname: process.env.HOSTNAME,
    nodeOptions: process.env.NODE_OPTIONS,
    nodeVersion: process.env.NODE_VERSION,
    path: process.env.PATH,
    pwd: process.env.PWD,
    shellLevel: toNumber(process.env.SHLVL),
    term: process.env.TERM,
    yarnVersion: process.env.YARN_VERSION,
  },

  encryption: {
    key: process.env.ENCRYPTION_KEY,
    iv: process.env.ENCRYPTION_IV,
  },

  matching: {
    bvnMatch: toNumber(process.env.BVN_MATCH),
    ninMatch: toNumber(process.env.NIN_MATCH),
    validationFlow: process.env.VALIDATION_FLOW,
  },

  sentry: {
    dsn: process.env.SENTRY_DSN,
    cliToken: process.env.SENTRY_CLI_TOKEN,
  },

  s3: {
    accessSecret: process.env.S3_ACCESS_SECRET,
    bucketName: process.env.S3_BUCKET_NAME,
    region: process.env.S3_REGION,
    uploadBase: process.env.S3_UPLOAD_BASE,
  },

  kafka: {
    baseUrl: process.env.KAFKA_BASE_URL,
    password: process.env.KAFKA_PASSWORD,
    username: process.env.KAFKA_USERNAME,
  },

  monify: {
    apiKey: process.env.MONIFY_API_KEY,
    contract: process.env.MONIFY_CONTRACT,
    secretKey: process.env.MONIFY_SECRET_KEY,
    sourceAccount: process.env.MONIFY_SOURCE_ACCOUNT,
    url: process.env.MONIFY_URL,
  },

  youverify: {
    apiKey: process.env.YOUVERIFY_API_KEY,
    baseUrl: process.env.YOUVERIFY_BASEURL,
  },

  termii: {
    apiKey: process.env.TERMII_API_KEY,
    senderId: process.env.TERMII_SENDER_ID,
  },
}));
