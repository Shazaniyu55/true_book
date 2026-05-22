export const failedResponseDto = (path: string = null, message: any = null) => ({
  statusCode: 500,
  success: false,
  message: message ?? 'Internal server error',
  path: path ?? '/',
  duration: 84,
  timestamp: 1753179285183,
});

export const successResponseDto = (path: string, message: string = null, result: any = null) => ({
  statusCode: 200,
  success: true,
  message: message ?? 'Request successful',
  result: result ?? {},
  path: path ?? '/',
  duration: 15713,
  timestamp: 1753018892095,
});

export const badRequestResponseDto = (
  path: string = null,
  message: any = null,
  errors: any = null,
) => ({
  statusCode: 400,
  success: false,
  message: message ?? 'Bad request',
  errors: errors ?? [
    {
      field: 'fieldname',
      errors: ['fieldname must be an .......', 'fieldname should not be empty'],
    },
  ],
  path: path ?? '/',
  duration: 84,
  timestamp: 1753179285183,
});
