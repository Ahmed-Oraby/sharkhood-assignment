import { ProviderAdapter } from './provider-adapter.interface';
import { talabatAdapter } from './talabat/talabat.adapter';

const adapters: Record<string, ProviderAdapter> = {
  talabat: talabatAdapter,
};

export function getProviderAdapter(provider: string): ProviderAdapter {
  const adapter = adapters[provider];

  if (!adapter) {
    throw new Error(`Unsupported provider: ${provider}`);
  }

  return adapter;
}
