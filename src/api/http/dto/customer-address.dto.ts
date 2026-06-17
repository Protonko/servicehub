import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

import { trimString } from '@common/utils/trim-string';
import { trimStringToNull } from '@common/utils/trim-string-to-null';
import { CustomerAddressWithServiceArea } from '@domain/model';

export class CreateCustomerAddressRequestDto {
  @IsUUID()
  serviceAreaId!: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  line1!: string;

  @Transform(({ value }) => trimStringToNull(value))
  @IsOptional()
  @IsString()
  @MaxLength(240)
  line2?: string | null;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  city!: string;

  @Transform(({ value }) => trimStringToNull(value))
  @IsOptional()
  @IsString()
  @MaxLength(40)
  postalCode?: string | null;

  @Transform(({ value }) => trimStringToNull(value))
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}

export class UpdateCustomerAddressRequestDto {
  @IsOptional()
  @IsUUID()
  serviceAreaId?: string;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  line1?: string;

  @Transform(({ value }) => trimStringToNull(value))
  @IsOptional()
  @IsString()
  @MaxLength(240)
  line2?: string | null;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  city?: string;

  @Transform(({ value }) => trimStringToNull(value))
  @IsOptional()
  @IsString()
  @MaxLength(40)
  postalCode?: string | null;

  @Transform(({ value }) => trimStringToNull(value))
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}

export interface CustomerAddressServiceAreaResponseDto {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

export interface CustomerAddressResponseDto {
  id: string;
  customerId: string;
  serviceArea: CustomerAddressServiceAreaResponseDto;
  line1: string;
  line2: string | null;
  city: string;
  postalCode: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerAddressObjectResponseDto {
  data: CustomerAddressResponseDto;
}

export interface CustomerAddressListResponseDto {
  data: CustomerAddressResponseDto[];
}

export const toCustomerAddressResponse = (
  address: CustomerAddressWithServiceArea,
): CustomerAddressObjectResponseDto => ({
  data: toCustomerAddressResponseData(address),
});

export const toCustomerAddressListResponse = (
  addresses: CustomerAddressWithServiceArea[],
): CustomerAddressListResponseDto => ({
  data: addresses.map(toCustomerAddressResponseData),
});

const toCustomerAddressResponseData = (
  addressWithServiceArea: CustomerAddressWithServiceArea,
): CustomerAddressResponseDto => ({
  id: addressWithServiceArea.address.id,
  customerId: addressWithServiceArea.address.customerId,
  serviceArea: {
    id: addressWithServiceArea.serviceArea.id,
    code: addressWithServiceArea.serviceArea.code,
    name: addressWithServiceArea.serviceArea.name,
    isActive: addressWithServiceArea.serviceArea.isActive,
  },
  line1: addressWithServiceArea.address.line1,
  line2: addressWithServiceArea.address.line2,
  city: addressWithServiceArea.address.city,
  postalCode: addressWithServiceArea.address.postalCode,
  notes: addressWithServiceArea.address.notes,
  createdAt: (addressWithServiceArea.address.createdAt ?? new Date(0)).toISOString(),
  updatedAt: (addressWithServiceArea.address.updatedAt ?? new Date(0)).toISOString(),
});
