import * as Joi from 'joi';

const NODE_ENVIRONMENTS: string[] = ['local', 'development', 'staging', 'beta', 'production'];

const DEFAULT_NODE_ENV: string = NODE_ENVIRONMENTS[0];
const DEFAULT_APP_PORT: number = 3000;
const DEFAULT_DATABASE_RETRY_ATTEMPTS: number = 5;

const optionalString = Joi.string().allow('').optional();
const optionalNumber = Joi.alternatives().try(Joi.number(), Joi.string()).allow('').optional();
const requiredString = Joi.string().required();
const requiredNumber = Joi.number().required();

export default {
  envFilePath: [
    '.local.env',
    '.development.env',
    '.staging.env',
    '.beta.env',
    '.production.env',
    '.env',
  ],
  cache: true,
  isGlobal: true,
  validationOptions: {
    allowUnknown: true,
    abortEarly: false,
  },
  validationSchema: Joi.object({
    // common
    APP_PORT: Joi.number().default(DEFAULT_APP_PORT),
    PORT: Joi.number().default(DEFAULT_APP_PORT),
    APP_NAME: Joi.string().required(),
    APP_HOSTNAME: Joi.string().required(),
    NODE_ENV: Joi.string()
      .valid(...NODE_ENVIRONMENTS)
      .default(DEFAULT_NODE_ENV),
    CORS_WHITELIST: optionalString,

    // typeorm
    DATABASE_TYPE: Joi.string().default('postgres'),
    DATABASE_LOGGING: Joi.boolean().default(false),
    DATABASE_RETRY_ATTEMPTS: Joi.number().default(DEFAULT_DATABASE_RETRY_ATTEMPTS),
    DB_HOST: requiredString,
    DB_NAME: requiredString,
    DB_PASS: requiredString,
    DB_PORT: requiredNumber,
    DB_USER: requiredString,

    // swagger
    SWAGGER_API_ROOT: requiredString,

    // runtime/container
    HOME: requiredString,
    HOSTNAME: requiredString,
    NODE_OPTIONS: requiredString,
    NODE_VERSION: requiredString,
    PATH: requiredString,
    PWD: requiredString,
    SHLVL: requiredNumber,
    TERM: requiredString,
    YARN_VERSION: requiredString,

    // kubernetes-injected variables
    KUBERNETES_PORT: process.env.NODE_ENV === 'production' ? requiredString : optionalString,
    KUBERNETES_PORT_443_TCP:
      process.env.NODE_ENV === 'production' ? requiredString : optionalString,
    KUBERNETES_PORT_443_TCP_ADDR:
      process.env.NODE_ENV === 'production' ? requiredString : optionalString,
    KUBERNETES_PORT_443_TCP_PORT:
      process.env.NODE_ENV === 'production' ? requiredNumber : optionalNumber,
    KUBERNETES_PORT_443_TCP_PROTO:
      process.env.NODE_ENV === 'production' ? requiredString : optionalString,
    KUBERNETES_SERVICE_HOST:
      process.env.NODE_ENV === 'production' ? requiredString : optionalString,
    KUBERNETES_SERVICE_PORT:
      process.env.NODE_ENV === 'production' ? requiredNumber : optionalNumber,
    KUBERNETES_SERVICE_PORT_HTTPS:
      process.env.NODE_ENV === 'production' ? requiredNumber : optionalNumber,

    // service urls
    BACKEND_URL: optionalString,
    BACKGROUND_JOB_SERVICE: optionalString,
    USER_SERVICE: optionalString,

    // database and job integrations
    MONGO_DB_URL: requiredString,

    // security/encryption
    ENCRYPTION_IV: requiredString,
    ENCRYPTION_KEY: requiredString,

    // matching/validation
    BVN_MATCH: requiredNumber,
    NIN_MATCH: requiredNumber,
    VALIDATION_FLOW: requiredString,

    // sentry
    SENTRY_CLI_TOKEN: requiredString,
    SENTRY_DSN: requiredString,

    // s3
    S3_ACCESS_SECRET: requiredString,
    S3_BUCKET_NAME: requiredString,
    S3_REGION: requiredString,
    S3_UPLOAD_BASE: requiredString,

    // kafka
    KAFKA_BASE_URL: requiredString,
    KAFKA_PASSWORD: requiredString,
    KAFKA_USERNAME: requiredString,

    // monify/monnify
    MONIFY_API_KEY: requiredString,
    MONIFY_CONTRACT: requiredString,
    MONIFY_SECRET_KEY: requiredString,
    MONIFY_SOURCE_ACCOUNT: requiredString,
    MONIFY_URL: requiredString,

    // youverify
    YOUVERIFY_API_KEY: requiredString,
    YOUVERIFY_BASEURL: requiredString,

    // termii
    TERMII_API_KEY: requiredString,
    TERMII_SENDER_ID: requiredString,

    JWT_ACCESS_SECRET: requiredString,
    JWT_REFRESH_SECRET: requiredString,
    JWT_ACCESS_EXPIRES_IN: requiredString,
    JWT_REFRESH_EXPIRES_IN: requiredString,
  }),
};
