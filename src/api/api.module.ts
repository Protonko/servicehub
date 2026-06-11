import { Module } from '@nestjs/common';

import { ApiHttpModule } from './http/api-http.module';

@Module({
  imports: [ApiHttpModule],
})
export class ApiModule {}
