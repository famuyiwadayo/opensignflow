import { randomBytes } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import type { IdPrefix, IdPrefixName } from '@opensignflow/shared';
import { ID_PREFIXES } from '@opensignflow/shared';

export type PublicIdPrefix = IdPrefix;

@Injectable()
export class IdGeneratorService {
  generate(name: IdPrefixName): string {
    return `${ID_PREFIXES[name]}_${randomBytes(16).toString('base64url')}`;
  }
}
