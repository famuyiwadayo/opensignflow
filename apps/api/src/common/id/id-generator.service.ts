import { randomBytes } from 'node:crypto';

import { Injectable } from '@nestjs/common';

export type PublicIdPrefix =
  | 'usr'
  | 'org'
  | 'mem'
  | 'ses'
  | 'doc'
  | 'fld'
  | 'rcp'
  | 'sreq'
  | 'ssub'
  | 'aud'
  | 'ai'
  | 'job'
  | 'subsc'
  | 'usg'
  | 'idem';

@Injectable()
export class IdGeneratorService {
  generate(prefix: PublicIdPrefix): string {
    return `${prefix}_${randomBytes(16).toString('base64url')}`;
  }
}
