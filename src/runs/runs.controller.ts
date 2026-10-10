import { Controller, Get, Param, Post } from '@nestjs/common';
import { RunsService } from './runs.service';
import { Query, ParseIntPipe } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';

@Controller('runs')
export class RunsController {
  constructor(private readonly runsService: RunsService) {}

  @Post()
  startRun() {
    return this.runsService.startRun();
  }

  @Get(':id')
  getRun(@Param('id') id: string) {
    return this.runsService.getRun(id);
  }

  @Get(':id/errors')
  getRunErrors(
    @Param('id') id: string,
    @Query('page', new ParseIntPipe({ optional: true }))
    page = 1,
    @Query('limit', new ParseIntPipe({ optional: true }))
    limit = 20,
  ) {
    if (page < 1 || limit < 1 || limit > 100) {
      throw new BadRequestException(
        'Page must be >= 1 and limit must be between 1 and 100',
      );
    }

    return this.runsService.getRunErrors(id, page, limit);
  }
}
