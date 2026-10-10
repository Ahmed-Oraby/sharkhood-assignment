import { Controller, Post } from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';

@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Post('sync')
  async syncRestaurants() {
    return this.restaurantsService.syncRestaurants();
  }
}
