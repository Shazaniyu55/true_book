import * as Joi from 'joi';

const NODE_ENVIRONMENTS: string[] = ['local', 'development', 'staging', 'beta', 'production', 'test'];
const DEFAULT_APP_PORT: number = 3000;
const DEFAULT_DATABASE_RETRY_ATTEMPTS: number = 5;

const optionalString = Joi.string().allow('').optional();
const optionalNumber = Joi.alternatives().try(Joi.number(), Joi.string()).allow('').optional();
const requiredString = Joi.string().required();
const requiredNumber = Joi.number().required();

export default {
  envFilePath: ['.local.env', '.development.env', '.staging.env', '.production.env', '.env'],
  cache: true,
  isGlobal: true,
  validationOptions: {
    allowUnknown: true,
    abortEarly: false,
  },
  validationSchema: Joi.object({
    // Application
    APP_NAME: requiredString,
    APP_HOSTNAME: requiredString,
    APP_PORT: Joi.number().default(DEFAULT_APP_PORT),
    PORT: Joi.number().default(DEFAULT_APP_PORT),
    NODE_ENV: Joi.string().valid(...NODE_ENVIRONMENTS).default('development'),
    CORS_WHITELIST: optionalString,
    SWAGGER_API_ROOT: requiredString,

    // Database (matches reference: DB_* not DATABASE_*)
    DATABASE_TYPE: Joi.string().default('postgres'),
    DATABASE_LOGGING: Joi.boolean().default(false),
    DATABASE_RETRY_ATTEMPTS: Joi.number().default(DEFAULT_DATABASE_RETRY_ATTEMPTS),
    DB_HOST: requiredString,
    DB_NAME: requiredString,
    DB_PASS: requiredString,
    DB_PORT: requiredNumber,
    DB_USER: requiredString,

    // JWT
    JWT_ACCESS_SECRET: requiredString,
    JWT_REFRESH_SECRET: requiredString,
    JWT_ACCESS_EXPIRES_IN: requiredString,
    JWT_REFRESH_EXPIRES_IN: requiredString,

    // Payment
    PAYMENT_GATEWAY: Joi.string().valid('paystack', 'flutterwave').default('paystack'),
    PAYSTACK_BASE_URL: optionalString,
    PAYSTACK_SECRET_KEY: optionalString,
    PAYSTACK_PUBLIC_KEY: optionalString,
    FLW_PUBLIC_KEY: optionalString,
    FLW_SECRET_KEY: optionalString,
    FLW_ENCRYPTION_KEY: optionalString,

    // KYC
    DOJAH_BASE_URL: optionalString,
    DOJAH_APP_ID: optionalString,
    DOJAH_PRIVATE_KEY: optionalString,
    DOJAH_PUBLIC_KEY: optionalString,

    // OTP
    OTP_DURATION_MINUTES: Joi.number().default(10),

    // Runtime (injected by container/shell)
    HOME: requiredString,
    HOSTNAME: requiredString,
    NODE_OPTIONS: optionalString,
    NODE_VERSION: requiredString,
    PATH: requiredString,
    PWD: requiredString,
    SHLVL: requiredNumber,
    TERM: optionalString,
    YARN_VERSION: optionalString,

    // Optional services
    MONGO_DB_URL: optionalString,
    ENCRYPTION_KEY: optionalString,
    ENCRYPTION_IV: optionalString,
    BVN_MATCH: optionalNumber,
    NIN_MATCH: optionalNumber,
    VALIDATION_FLOW: optionalString,
    SENTRY_DSN: optionalString,
    SENTRY_CLI_TOKEN: optionalString,
    S3_ACCESS_SECRET: optionalString,
    S3_BUCKET_NAME: optionalString,
    S3_REGION: optionalString,
    S3_UPLOAD_BASE: optionalString,
    KAFKA_BASE_URL: optionalString,
    KAFKA_PASSWORD: optionalString,
    KAFKA_USERNAME: optionalString,
    MONIFY_API_KEY: optionalString,
    MONIFY_CONTRACT: optionalString,
    MONIFY_SECRET_KEY: optionalString,
    MONIFY_SOURCE_ACCOUNT: optionalString,
    MONIFY_URL: optionalString,
    YOUVERIFY_API_KEY: optionalString,
    YOUVERIFY_BASEURL: optionalString,
    TERMII_API_KEY: optionalString,
    TERMII_SENDER_ID: optionalString,
  }),
};
