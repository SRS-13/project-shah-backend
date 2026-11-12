import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({
    summary: 'Health Check Endpoint',
    description: 'Returns a simple message indicating that the API is running.',
  })
  check() {
    return { status: 'ok', service: 'teamflow-api' };
  }
  getHello(): string {
    return this.appService.getHello();
  }
}
