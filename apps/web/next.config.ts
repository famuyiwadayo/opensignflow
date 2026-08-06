import { loadRepositoryEnvironment } from '@opensignflow/config';
import type { NextConfig } from 'next';

// Makes the root local-development .env available before Next evaluates config.
loadRepositoryEnvironment();

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
