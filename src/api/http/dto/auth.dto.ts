import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

import { RoleCode } from '@domain/model';
import { AuthUserSummary } from '@application/read-models';

export class RegisterRequestDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(1)
  fullName!: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class LoginRequestDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}

export interface AuthUserResponseDto {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  roles: RoleCode[];
}

export interface AuthUserObjectResponseDto {
  data: {
    user: AuthUserResponseDto;
  };
}

export const toAuthUserResponse = (user: AuthUserSummary): AuthUserObjectResponseDto => ({
  data: {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      roles: user.roles,
    },
  },
});
