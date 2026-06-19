import { minutesToMilliseconds } from '@common/utils/minutes-to-milliseconds';

export interface SlaDeadlineInput {
  startAt: Date;
  assignmentDeadlineMinutes: number;
  completionDeadlineMinutes: number;
}

export interface SlaDeadlines {
  assignmentDeadlineAt: Date;
  completionDeadlineAt: Date;
}

export class SlaDeadlineCalculator {
  static calculate(input: SlaDeadlineInput): SlaDeadlines {
    const startAt = new Date(input.startAt);
    const assignmentDeadlineMinutes = this.requirePositiveInteger(
      input.assignmentDeadlineMinutes,
      'assignmentDeadlineMinutes',
    );
    const completionDeadlineMinutes = this.requirePositiveInteger(
      input.completionDeadlineMinutes,
      'completionDeadlineMinutes',
    );

    return {
      assignmentDeadlineAt: new Date(
        startAt.getTime() + minutesToMilliseconds(assignmentDeadlineMinutes),
      ),
      completionDeadlineAt: new Date(
        startAt.getTime() + minutesToMilliseconds(completionDeadlineMinutes),
      ),
    };
  }

  private static requirePositiveInteger(value: number, fieldName: string): number {
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`${fieldName} must be a positive integer`);
    }

    return value;
  }
}
