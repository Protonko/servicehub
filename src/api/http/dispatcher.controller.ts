import { Controller, ForbiddenException, Get, Query, UseGuards } from '@nestjs/common';

import { AuthenticatedActor } from '@application/auth';
import { DispatcherQueueForbiddenError } from '@application/errors';
import { GetDispatcherQueueUseCase } from '@application/use-cases';
import { RoleCode } from '@domain/model';

import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { GetDispatcherQueueQueryDto, toDispatcherQueueResponse } from './dto/dispatcher-queue.dto';
import { ApiErrorResponseFactory } from './factories/api-error-response.factory';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Controller('dispatcher')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DispatcherController {
  constructor(private readonly getDispatcherQueueUseCase: GetDispatcherQueueUseCase) {}

  @Get('queue')
  @Roles(RoleCode.Dispatcher, RoleCode.Admin)
  async getQueue(
    @CurrentUser() actor: AuthenticatedActor,
    @Query() dto: GetDispatcherQueueQueryDto,
  ) {
    try {
      const result = await this.getDispatcherQueueUseCase.execute({
        actor,
        criteria: {
          status: dto.status,
          priority: dto.priority,
          serviceAreaId: dto.serviceAreaId,
          slaState: dto.slaState,
        },
        pagination: { limit: dto.limit, offset: dto.offset },
      });

      return toDispatcherQueueResponse(result.requests, {
        limit: result.limit,
        offset: result.offset,
        total: result.total,
      });
    } catch (error) {
      if (error instanceof DispatcherQueueForbiddenError) {
        throw new ForbiddenException(
          ApiErrorResponseFactory.create('DISPATCHER_QUEUE_FORBIDDEN', error.message),
        );
      }

      throw error;
    }
  }
}
