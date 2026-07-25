

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Response, Request } from 'express';
import { instanceToPlain } from 'class-transformer';


export interface TResponse<T> {
  statusCode: number;
  success: boolean;
  message: string;
  result: T;
  path: string;
  duration: number;
  timestamp: number;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, TResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<TResponse<T>> {
    const startTime = Date.now();
    return next.handle().pipe(
      map((res: unknown) => this.responseHandler(res, context, startTime)),
      catchError((err: HttpException) =>
        throwError(() => this.errorHandler(err, context, startTime)),
      ),
    );
  }

  responseHandler(res: any, context: ExecutionContext, startTime: number): TResponse<T> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const statusCode = response.statusCode;

    return {
      statusCode,
      success: true,
      message: 'Request successful',
      result: instanceToPlain(res) as T,
      path: request.url,
      duration: Date.now() - startTime,
      timestamp: Date.now(),
    };
  }

  errorHandler(exception: any, context: ExecutionContext, startTime: number): any {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const message = exception?.getResponse ? exception?.getResponse().message : exception.message;
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    if (exception instanceof BadRequestException) {
      if (typeof message === 'object') {
        const responseMsr = message.map((data: any) => {
          const issues = { field: '', errors: [] };
          if (data?.constraints) {
            issues.field = data.property;
            for (const key of Object.keys(data.constraints)) {
              issues.errors.push(data.constraints[key]);
            }
          }
          if (data?.children) {
            data.children.forEach((element) => {
              issues.field = `${data.property}.${element.property}`;
              for (const key of Object.keys(element.constraints)) {
                issues.errors.push(element.constraints[key]);
              }
            });
          }
          return issues;
        });

        return response.status(status).json({
          statusCode: status,
          success: false,
          message: 'Bad Request',
          errors: responseMsr,
          path: request.path,
          duration: Date.now() - startTime,
          timestamp: Date.now(),
        });
      }
    }

    response.status(status).json({
      statusCode: status,
      success: false,
      message: message ?? 'Request failed',
      path: request.url,
      duration: Date.now() - startTime,
      timestamp: Date.now(),
    });
  }
}



// import {
//   Injectable,
//   NestInterceptor,
//   ExecutionContext,
//   CallHandler,
//   HttpException,
//   HttpStatus,
//   BadRequestException,
// } from '@nestjs/common';
// import { Observable, throwError } from 'rxjs';
// import { catchError, map } from 'rxjs/operators';
// import { Response, Request } from 'express';
// import { instanceToPlain } from 'class-transformer';

// /**
//  * Laravel-style envelope so the existing frontend contract works unchanged:
//  *   success -> { status: true,  data, message }
//  *   error   -> { status: false, message, errors? }
//  * Validation failures use HTTP 422 with `errors` keyed by field name, e.g.
//  *   { account_number: ['Account number must be exactly 10 digits'] }
//  */
// export interface TResponse<T> {
//   status: boolean;
//   statusCode: number;
//   message: string;
//   data: T;
//   path: string;
//   duration: number;
//   timestamp: number;
// }

// @Injectable()
// export class ResponseInterceptor<T> implements NestInterceptor<T, TResponse<T>> {
//   intercept(context: ExecutionContext, next: CallHandler): Observable<TResponse<T>> {
//     const startTime = Date.now();
//     return next.handle().pipe(
//       map((res: unknown) => this.responseHandler(res, context, startTime)),
//       catchError((err: HttpException) =>
//         throwError(() => this.errorHandler(err, context, startTime)),
//       ),
//     );
//   }

//   responseHandler(res: any, context: ExecutionContext, startTime: number): TResponse<T> {
//     const ctx = context.switchToHttp();
//     const response = ctx.getResponse();
//     const request = ctx.getRequest();
//     const statusCode = response.statusCode;

//     const data = instanceToPlain(res);

//     // Let a use-case/service surface its own message (e.g. { message, status })
//     // while still exposing the payload under `data`.
//     const message =
//       data && typeof data === 'object' && typeof (data as any).message === 'string'
//         ? (data as any).message
//         : 'Request successful';

//     return {
//       status: true,
//       statusCode,
//       message,
//       data: data as T,
//       path: request.url,
//       duration: Date.now() - startTime,
//       timestamp: Date.now(),
//     };
//   }

//   errorHandler(exception: any, context: ExecutionContext, startTime: number): any {
//     const ctx = context.switchToHttp();
//     const request = ctx.getRequest<Request>();
//     const response = ctx.getResponse<Response>();

//     const status =
//       exception instanceof HttpException
//         ? exception.getStatus()
//         : HttpStatus.INTERNAL_SERVER_ERROR;

//     const raw = exception?.getResponse ? exception.getResponse() : exception?.message;
//     const rawMessage =
//       raw && typeof raw === 'object' && 'message' in raw ? (raw as any).message : raw;

//     // ── Validation errors (class-validator array) → Laravel-style 422 map ──
//     if (exception instanceof BadRequestException && Array.isArray(rawMessage)) {
//       const errors: Record<string, string[]> = {};

//       for (const item of rawMessage as any[]) {
//         if (item?.constraints) {
//           errors[item.property] = Object.values(item.constraints);
//         }
//         if (item?.children?.length) {
//           for (const child of item.children) {
//             if (child?.constraints) {
//               errors[`${item.property}.${child.property}`] = Object.values(child.constraints);
//             }
//           }
//         }
//       }

//       return response.status(HttpStatus.UNPROCESSABLE_ENTITY).json({
//         status: false,
//         statusCode: HttpStatus.UNPROCESSABLE_ENTITY, // 422
//         message: 'Validation failed',
//         errors,
//         path: request.path,
//         duration: Date.now() - startTime,
//         timestamp: Date.now(),
//       });
//     }

//     // ── Everything else (business errors, 401/403/404/500, etc.) ──
//     return response.status(status).json({
//       status: false,
//       statusCode: status,
//       message: Array.isArray(rawMessage)
//         ? rawMessage.join(', ')
//         : (rawMessage ?? 'Request failed'),
//       path: request.url,
//       duration: Date.now() - startTime,
//       timestamp: Date.now(),
//     });
//   }
// }
