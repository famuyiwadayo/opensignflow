import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ObjectStorage } from '@opensignflow/storage';

import { apiError, ErrorCode } from '../common';
import type { CreateSignedUrlInput, UploadObjectInput } from './storage.types';

@Injectable()
export class StorageService {
  private readonly storage: ObjectStorage;

  constructor(@Inject(ConfigService) config: ConfigService) {
    this.storage = new ObjectStorage({
      bucket: required(config, 'S3_BUCKET'),
      region: config.get<string>('S3_REGION') ?? 'us-east-1',
      endpoint: config.get<string>('S3_ENDPOINT'),
      accessKeyId: required(config, 'S3_ACCESS_KEY_ID'),
      secretAccessKey: required(config, 'S3_SECRET_ACCESS_KEY'),
      forcePathStyle: config.get<string>('S3_FORCE_PATH_STYLE') === 'true',
    });
  }

  async uploadObject(input: UploadObjectInput): Promise<void> {
    try {
      await this.storage.upload(input);
    } catch (error) {
      throw new ServiceUnavailableException(
        apiError(
          ErrorCode.STORAGE_UPLOAD_FAILED,
          'Document could not be uploaded to storage.',
          [
            {
              issue:
                error instanceof Error
                  ? error.message
                  : 'Unknown storage error.',
            },
          ],
        ),
      );
    }
  }

  async createSignedDownloadUrl(input: CreateSignedUrlInput): Promise<string> {
    try {
      return await this.storage.createSignedDownloadUrl(input);
    } catch (error) {
      throw new ServiceUnavailableException(
        apiError(
          ErrorCode.STORAGE_DOWNLOAD_URL_FAILED,
          'Download URL could not be generated.',
          [
            {
              issue:
                error instanceof Error
                  ? error.message
                  : 'Unknown storage error.',
            },
          ],
        ),
      );
    }
  }
}
function required(config: ConfigService, key: string) {
  const value = config.get<string>(key);
  if (!value) {
    throw new Error(`${key} is required to initialize object storage.`);
  }
  return value;
}
