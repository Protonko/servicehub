import { Module } from '@nestjs/common';

import { QueueModule } from './queues/queue.module';

@Module({
  imports: [QueueModule],
  exports: [QueueModule],
})
export class InfraModule {}
