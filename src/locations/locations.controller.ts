import { Controller, Get, Post } from '@nestjs/common';
import { LocationsService } from './locations.service';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get('raw/count')
  async getRawDocumentCount() {
    return {
      count: await this.locationsService.getRawDocumentCount(),
    };
  }

  @Get('raw/sample')
  async getFirstRawDocument() {
    return this.locationsService.getFirstRawDocument();
  }

  @Get('normalization-preview')
  async getNormalizationPreview() {
    return this.locationsService.getNormalizationPreview();
  }

  @Post('sync')
  async syncLocations() {
    return this.locationsService.syncLocations();
  }
}
