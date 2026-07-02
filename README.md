# Tru_Booker Backend Service Boilerplate

NestJS backend boilerplate for building modular services with TypeORM, PostgreSQL, Swagger, shared validation, response formatting, adapters, repositories, services, and transactional usecases.

The project is intentionally small. It gives new developers a working structure to copy from, then remove or replace once real domain modules are added.

## Stack

- NestJS 10
- TypeScript
- TypeORM 0.3
- PostgreSQL
- Swagger/OpenAPI
- Joi /environment validation
- Jest 
- Bruno API collection

## Architecture

The codebase uses a layered modular-monolith style:

```text
HTTP request
  -> Controller
  -> Broker
  -> Usecase
  -> Service
  -> Repository / Adapter
  -> TypeORM Entity / External Provider
```

### Layer Responsibilities

| Layer      | Responsibility                                           | Example                                                       |
| ---------- | -------------------------------------------------------- | ------------------------------------------------------------- |
| Module     | Registers controllers, providers, repositories, entities | `src/modules/example/example.module.ts`                       |
| Controller | Handles HTTP routes, DTO input, and calls the broker     | `src/modules/example/controllers/example-task.controller.ts`  |
| Broker     | Runs one or more usecases inside a TypeORM transaction   | `src/broker/broker.ts`                                        |
| Usecase    | Coordinates one business action                          | `src/modules/example/usecases/create-example-task.usecase.ts` |
| Service    | Holds domain/business logic                              | `src/modules/example/services/example-task.service.ts`        |
| Repository | Wraps TypeORM persistence logic                          | `src/adapters/repositories/example-task.repository.ts`        |
| Adapter    | Wraps infrastructure or provider-specific behavior       | `src/adapters/example/example-reference.adapter.ts`           |
| Entity     | Defines database shape                                   | `src/modules/core/entities/example-task.entity.ts`        |

## Project Layout

```text
src/
├── adapters/
│   ├── example/                 # Example infrastructure adapter
│   └── repositories/            # TypeORM repositories
├── broker/
│   ├── broker.ts                # Transactional usecase runner
│   ├── transaction.provider.ts  # Request-scoped transaction helper
│   └── types.ts                 # Usecase base class
├── configs/
│   ├── common.config.ts         # App-level config
│   ├── schema.config.ts         # Joi env validation
│   └── typeorm.config.ts        # TypeORM datasource config
├── modules/
│   ├── core/                    # Shared entities
│   └── example/                 # Compileable example feature
├── shared/
│   ├── decorators/
│   ├── dtos/
│   ├── guards/
│   ├── interceptors/
│   ├── interface/
│   ├── repositories/
│   ├── utils/
│   └── validations/
├── app.module.ts
└── main.ts
```

## Example Feature

The example feature is available at:

- `POST /examples`
- `GET /examples`

Create request:

```json
{
  "title": "Create onboarding checklist",
  "description": "A short task used to demonstrate the boilerplate layers.",
  "status": "draft",
  "metadata": {
    "source": "readme",
    "owner": "platform"
  }
}
```

The create flow is:

```text
ExampleTaskController.create()
  -> Broker.runUsecases([CreateExampleTaskUsecase], dto)
  -> CreateExampleTaskUsecase.execute(entityManager, args)
  -> ExampleTaskService.createTask(dto, entityManager)
  -> ExampleTaskRepository.createExampleTask(data, entityManager)
  -> ExampleTask entity
```

Use it as the reference when adding new features. The feature can be removed later by deleting `src/modules/example`, `src/adapters/example`, `src/adapters/repositories/example.repository.ts`, `src/modules/core/entities/example.entity.ts`, and removing `ExampleModule` from `src/app.module.ts`.

## Getting Started

Install dependencies:

```bash
npm install
```

Create an environment file:

```bash
cp .env.sample .env
```

Minimum local values:

```env
APP_NAME=Tru_booker Backend Service
APP_HOSTNAME=localhost
APP_PORT=3030
NODE_ENV=development
CORS_WHITELIST=""

DATABASE_TYPE=postgres
DATABASE_HOST=localhost
DATABASE_DB=misau_backend
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_PORT=5432
DATABASE_LOGGING=true
DATABASE_RETRY_ATTEMPTS=5

SWAGGER_API_ROOT=docs
```

Start the server:

```bash
npm run start:dev
```

Swagger will be available at:

```text
http://localhost:3030/docs
```

## Scripts

```bash
npm run build              # Compile the project
npm run start              # Start once with Nest
npm run start:dev          # Start in watch mode
npm run start:prod         # Run compiled dist/main
npm run lint               # ESLint with fixes
npm run format             # Prettier format
npm run test               # Unit tests
npm run test:e2e           # E2E tests
npm run test:cov           # Coverage
```

TypeORM migration scripts:

```bash
npm run migration:show
npm run migration:run
npm run migration:generate --name=CreateExampleTable
npm run migration:create --name=CreateExampleTable
npm run migration:revert
```

## Configuration

Environment validation lives in `src/configs/schema.config.ts`.

App config lives in `src/configs/common.config.ts`.

Database config lives in `src/configs/typeorm.config.ts`. The datasource is exported as `connectionSource` for TypeORM CLI commands.

Important database defaults:

- `synchronize` is disabled.
- Migrations run automatically only when `NODE_ENV=test`.
- Test mode drops schema through the TypeORM config.
- SSL is disabled only for `NODE_ENV=local`; other environments use `rejectUnauthorized: false`.

## Response Format

All responses pass through `ResponseInterceptor`.

Success responses look like:

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Request successful",
  "result": {},
  "path": "/examples/tasks",
  "duration": 10,
  "timestamp": 1767225600000
}
```

Validation errors are returned as field-level errors by `CustomFieldValidationPipe` and the interceptor.

## Adding a New Feature

Follow the example module pattern:

1. Add an entity in `src/modules/core/entities`.
2. Add a repository in `src/adapters/repositories`.
3. Add any external/provider wrapper in `src/adapters/<feature>`.
4. Add DTOs, service, usecases, controller, and module in `src/modules/<feature>`.
5. Register the entity with `TypeOrmModule.forFeature([...])` inside the feature module.
6. Register the feature module in `src/app.module.ts`.
7. Keep controllers thin; put orchestration in usecases and business rules in services.
8. Pass `EntityManager` through repository methods when a usecase runs inside the broker transaction.

## Adapters

Adapters isolate provider-specific details from domain services.

Current adapter examples:

- `ExampleReferenceAdapter`: generates task references for the example feature.

## Authentication

The shared `JwtAuthGuard` supports `@Public()` routes, but it is not currently registered globally in `AppModule`. The only global guard registered now is `ThrottlerGuard`.

Use `src/shared/decorators/isPublic.decorator.ts` and `src/shared/guards/jwt-auth.guard.ts` as the starting point when enabling JWT authentication.

## Testing Notes

Jest is configured in `package.json`, and E2E config lives in `test/jest-e2e.json`.

The checked-in E2E spec is still the Nest starter example. Update it when real health or feature routes are finalized.

## API Collections

Bruno collection metadata lives in `collections/`. Add request files there as endpoints stabilize.

## Developer Conventions

- Use path aliases from `tsconfig.json`, such as `@modules/*`, `@adapters/*`, `@shared/*`, `@broker/*`, and `@config/*`.
- Keep repositories focused on persistence.
- Keep provider integrations behind adapters.
- Keep usecases small and composable.
- Use the broker when a route should run one or more usecases in a transaction.
- Extend `BaseEntity` for shared `id`, timestamps, soft delete, and audit columns.
