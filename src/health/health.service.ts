import {
  Injectable,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import Redis from 'ioredis';

@Injectable()
export class HealthService implements OnModuleDestroy {
  private readonly redis: Redis;

  constructor(
    @InjectConnection('raw')
    private readonly rawConnection: Connection,

    @InjectConnection('target')
    private readonly targetConnection: Connection,

    private readonly configService: ConfigService,
  ) {
    this.redis = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      lazyConnect: true,
      connectTimeout: 2000,
      retryStrategy: () => null,
    });
  }

  async check() {
    const rawMongo = this.rawConnection.readyState === 1;
    const targetMongo = this.targetConnection.readyState === 1;

    let redis = false;

    try {
      if (this.redis.status === 'wait') {
        await this.redis.connect();
      }

      redis = (await this.redis.ping()) === 'PONG';
    } catch {
      redis = false;
    }

    const services = {
      rawMongo: rawMongo ? 'up' : 'down',
      targetMongo: targetMongo ? 'up' : 'down',
      redis: redis ? 'up' : 'down',
    };

    if (!rawMongo || !targetMongo || !redis) {
      throw new ServiceUnavailableException({
        status: 'unhealthy',
        services,
      });
    }

    return {
      status: 'healthy',
      services,
    };
  }

  async onModuleDestroy() {
    this.redis.disconnect();
  }
}
