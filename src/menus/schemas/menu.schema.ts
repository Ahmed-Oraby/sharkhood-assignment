import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MenuDocument = HydratedDocument<Menu>;

@Schema({
  timestamps: true,
  collection: 'menus',
})
export class Menu {
  @Prop({ required: true })
  provider: string;

  @Prop({ required: true })
  restaurantId: number;

  @Prop({ required: true })
  itemId: number;

  @Prop({ required: true })
  name: string;

  @Prop({ type: String, default: null })
  description: string | null;

  @Prop({ type: String, default: null })
  image: string | null;

  @Prop({ required: true })
  price: number;
}

export const MenuSchema = SchemaFactory.createForClass(Menu);

MenuSchema.index({ provider: 1, restaurantId: 1, itemId: 1 }, { unique: true });
