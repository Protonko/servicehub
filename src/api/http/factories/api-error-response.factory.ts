export type ApiErrorDetails = Record<string, unknown>;

export interface ApiErrorResponseDto {
  error: {
    code: string;
    message: string;
    details: ApiErrorDetails;
  };
}

export const ApiErrorResponseFactory = {
  create(
    code: string,
    message: string,
    details: ApiErrorDetails = {},
  ): ApiErrorResponseDto {
    return {
      error: {
        code,
        message,
        details,
      },
    };
  },
};
