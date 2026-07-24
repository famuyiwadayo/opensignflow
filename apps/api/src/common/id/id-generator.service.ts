import { randomBytes } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { IdPrefix } from '@opensignflow/shared';

export type PublicIdPrefix = IdPrefix;

@Injectable()
export class IdGeneratorService {
  generate(prefix: PublicIdPrefix): string {
    return `${prefix}_${randomBytes(16).toString('base64url')}`;
  }
}
