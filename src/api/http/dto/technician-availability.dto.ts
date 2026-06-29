import { Transform } from 'class-transformer';
import { IsBoolean, IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

import { TechnicianCalendar } from '@application/read-models';
import { trimStringToNull } from '@common/utils/trim-string-to-null';
import { TechnicianAvailabilityWindow } from '@domain/model';

export class CreateTechnicianAvailabilityWindowRequestDto {
  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsBoolean()
  isAvailable!: boolean;

  @Transform(({ value }) => trimStringToNull(value))
  @IsOptional()
  @IsString()
  @MaxLength(160)
  reason?: string | null;
}

export interface TechnicianAvailabilityWindowResponseDto {
  id: string;
  technicianId: string;
  startsAt: string;
  endsAt: string;
  isAvailable: boolean;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TechnicianAvailabilityWindowObjectResponseDto {
  data: TechnicianAvailabilityWindowResponseDto;
}

export interface TechnicianCalendarResponseDto {
  data: {
    technicianId: string;
    availabilityWindows: TechnicianAvailabilityWindowResponseDto[];
  };
}

const toWindowData = (
  window: TechnicianAvailabilityWindow | TechnicianCalendar['availabilityWindows'][number],
): TechnicianAvailabilityWindowResponseDto => ({
  id: window.id,
  technicianId: window.technicianId,
  startsAt: window.startsAt.toISOString(),
  endsAt: window.endsAt.toISOString(),
  isAvailable: window.isAvailable,
  reason: window.reason,
  createdAt: window.createdAt?.toISOString() ?? '',
  updatedAt: window.updatedAt?.toISOString() ?? '',
});

export const toTechnicianAvailabilityWindowResponse = (
  window: TechnicianAvailabilityWindow,
): TechnicianAvailabilityWindowObjectResponseDto => ({ data: toWindowData(window) });

export const toTechnicianCalendarResponse = (
  calendar: TechnicianCalendar,
): TechnicianCalendarResponseDto => ({
  data: {
    technicianId: calendar.technicianId,
    availabilityWindows: calendar.availabilityWindows.map(toWindowData),
  },
});
