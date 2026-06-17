import {
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { REFRESH_TOKEN_COOKIE, AuthenticatedActor } from '@application/auth';
import {
  DuplicateEmailError,
  InactiveUserError,
  InvalidCredentialsError,
  UnauthenticatedError,
} from '@application/errors';
import {
  GetCurrentUserUseCase,
  LoginUseCase,
  RefreshSessionUseCase,
  RegisterCustomerUseCase,
} from '@application/use-cases';
import {
  getCookie,
  clearAuthCookies,
  setAccessCookie,
  setAuthCookies,
} from './cookies/auth-cookie.helper';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginRequestDto, RegisterRequestDto, toAuthUserResponse } from './dto/auth.dto';
import { ApiErrorResponseFactory } from './factories/api-error-response.factory';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

interface HeaderRequest {
  headers: {
    cookie?: string;
  };
}

interface HeaderResponse {
  setHeader(name: string, value: string | string[]): void;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerCustomerUseCase: RegisterCustomerUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshSessionUseCase: RefreshSessionUseCase,
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterRequestDto) {
    try {
      const result = await this.registerCustomerUseCase.execute(dto);

      return toAuthUserResponse(result.user);
    } catch (error) {
      this.mapAuthError(error);
    }
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginRequestDto, @Res({ passthrough: true }) response: HeaderResponse) {
    try {
      const result = await this.loginUseCase.execute(dto);

      setAuthCookies(response, this.configService, result.tokens);

      return toAuthUserResponse(result.user);
    } catch (error) {
      this.mapAuthError(error);
    }
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() request: HeaderRequest,
    @Res({ passthrough: true }) response: HeaderResponse,
  ) {
    try {
      const refreshToken = getCookie(request.headers.cookie, REFRESH_TOKEN_COOKIE);

      if (!refreshToken) {
        throw new UnauthenticatedError('Invalid refresh token');
      }

      const result = await this.refreshSessionUseCase.execute(refreshToken);

      setAccessCookie(response, this.configService, result.tokens.accessToken);

      return toAuthUserResponse(result.user);
    } catch (error) {
      this.mapAuthError(error);
    }
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) response: HeaderResponse): void {
    clearAuthCookies(response, this.configService);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() actor: AuthenticatedActor) {
    try {
      const result = await this.getCurrentUserUseCase.execute(actor.userId);

      return toAuthUserResponse(result.user);
    } catch (error) {
      this.mapAuthError(error);
    }
  }

  private mapAuthError(error: unknown): never {
    if (error instanceof DuplicateEmailError) {
      throw new ConflictException(
        ApiErrorResponseFactory.create('EMAIL_ALREADY_REGISTERED', error.message),
      );
    }

    if (error instanceof InvalidCredentialsError || error instanceof UnauthenticatedError) {
      throw new UnauthorizedException(
        ApiErrorResponseFactory.create('UNAUTHENTICATED', error.message),
      );
    }

    if (error instanceof InactiveUserError) {
      throw new ForbiddenException(ApiErrorResponseFactory.create('USER_INACTIVE', error.message));
    }

    throw error;
  }
}
