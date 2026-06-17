import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import {
  CreateCustomerAddressUseCase,
  ListCustomerAddressesUseCase,
  UpdateCustomerAddressUseCase,
} from '@application/use-cases';
import { AuthenticatedActor } from '@application/auth';
import {
  CustomerAddressNotFoundError,
  EmptyCustomerAddressUpdateError,
  ServiceAreaNotFoundError,
} from '@application/errors';
import { RoleCode } from '@domain/model';
import {
  CreateCustomerAddressRequestDto,
  UpdateCustomerAddressRequestDto,
  toCustomerAddressListResponse,
  toCustomerAddressResponse,
} from './dto/customer-address.dto';
import { ApiErrorResponseFactory } from './factories/api-error-response.factory';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Controller('customer-addresses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleCode.Customer)
export class CustomerAddressesController {
  constructor(
    private readonly createCustomerAddressUseCase: CreateCustomerAddressUseCase,
    private readonly listCustomerAddressesUseCase: ListCustomerAddressesUseCase,
    private readonly updateCustomerAddressUseCase: UpdateCustomerAddressUseCase,
  ) {}

  @Post()
  async createAddress(
    @CurrentUser() actor: AuthenticatedActor,
    @Body() dto: CreateCustomerAddressRequestDto,
  ) {
    try {
      const result = await this.createCustomerAddressUseCase.execute({
        customerId: actor.userId,
        ...dto,
      });

      return toCustomerAddressResponse(result.address);
    } catch (error) {
      this.mapCustomerAddressError(error);
    }
  }

  @Get()
  async listAddresses(@CurrentUser() actor: AuthenticatedActor) {
    const result = await this.listCustomerAddressesUseCase.execute({
      customerId: actor.userId,
    });

    return toCustomerAddressListResponse(result.addresses);
  }

  @Patch(':addressId')
  async updateAddress(
    @CurrentUser() actor: AuthenticatedActor,
    @Param('addressId', new ParseUUIDPipe()) addressId: string,
    @Body() dto: UpdateCustomerAddressRequestDto,
  ) {
    try {
      const result = await this.updateCustomerAddressUseCase.execute({
        customerId: actor.userId,
        addressId,
        ...dto,
      });

      return toCustomerAddressResponse(result.address);
    } catch (error) {
      this.mapCustomerAddressError(error);
    }
  }

  private mapCustomerAddressError(error: unknown): never {
    if (error instanceof EmptyCustomerAddressUpdateError) {
      throw new BadRequestException(
        ApiErrorResponseFactory.create('CUSTOMER_ADDRESS_VALIDATION_FAILED', error.message),
      );
    }

    if (error instanceof ServiceAreaNotFoundError) {
      throw new NotFoundException(
        ApiErrorResponseFactory.create('SERVICE_AREA_NOT_FOUND', error.message),
      );
    }

    if (error instanceof CustomerAddressNotFoundError) {
      throw new NotFoundException(
        ApiErrorResponseFactory.create('CUSTOMER_ADDRESS_NOT_FOUND', error.message),
      );
    }

    throw error;
  }
}
