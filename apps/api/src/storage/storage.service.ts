import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { apiError, ErrorCode } from '@/common';
import type { CreateSignedUrlInput, UploadObjectInput } from './storage.types';

@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {
    this.bucket = this.requiredConfig('S3_BUCKET');

    this.client = new S3Client({
      region: this.configService.get<string>('S3_REGION') ?? 'us-east-1',
      endpoint: this.configService.get<string>('S3_ENDPOINT'),
      credentials: {
        accessKeyId: this.requiredConfig('S3_ACCESS_KEY_ID'),
        secretAccessKey: this.requiredConfig('S3_SECRET_ACCESS_KEY'),
      },
      forcePathStyle:
        this.configService.get<string>('S3_FORCE_PATH_STYLE') === 'true',
    });
  }

  async uploadObject(input: UploadObjectInput): Promise<void> {
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: input.key,
          Body: input.body,
          ContentType: input.contentType,
          ContentLength: input.contentLength,
        }),
      );
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
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        ResponseContentType: input.contentType,
        ResponseContentDisposition: input.fileName
          ? `attachment; filename="${this.sanitizeFileName(input.fileName)}"`
          : undefined,
      });

      return getSignedUrl(this.client, command, {
        expiresIn: input.expiresInSeconds ?? 300,
      });
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

  private requiredConfig(key: string): string {
    const value = this.configService.get<string>(key);

    if (!value) {
      throw new Error(`${key} is required to initialize object storage.`);
    }

    return value;
  }

  private sanitizeFileName(fileName: string): string {
    return fileName.replace(/["\\\r\n]/g, '_');
  }
}
