import {
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';
import { plainToInstance, Transform } from 'class-transformer';

class EnvironmentVariables {
  @IsString()
  @IsNotEmpty()
  MONGODB_RAW_URI: string;

  @IsString()
  @IsNotEmpty()
  MONGODB_TARGET_URI: string;

  @IsString()
  @IsNotEmpty()
  REDIS_HOST: string;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(65535)
  REDIS_PORT: number;
}

export function validateEnvironment(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: false,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
    whitelist: true,
  });

  if (errors.length > 0) {
    throw new Error(
      `Invalid environment configuration:\n${errors
        .map((error) => Object.values(error.constraints ?? {}).join(', '))
        .join('\n')}`,
    );
  }

  return validatedConfig;
}
