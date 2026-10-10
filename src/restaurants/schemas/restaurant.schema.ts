import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RestaurantDocument = HydratedDocument<Restaurant>;

@Schema({ timestamps: true, collection: 'restaurants' })
export class Restaurant {
  @Prop({ required: true })
  provider: string;

  @Prop({ required: true })
  restaurantId: number;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  url: string;
}

export const RestaurantSchema = SchemaFactory.createForClass(Restaurant);

RestaurantSchema.index({ provider: 1, restaurantId: 1 }, { unique: true });
