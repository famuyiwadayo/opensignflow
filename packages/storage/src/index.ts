import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export type StorageConfig = {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
};

export type UploadObjectInput = {
  key: string;
  body: Uint8Array;
  contentType: string;
  contentLength?: number;
};

export class ObjectStorage {
  private readonly client: S3Client;

  constructor(private readonly config: StorageConfig) {
    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
      forcePathStyle: config.forcePathStyle,
    });
  }

  async upload(input: UploadObjectInput) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
        ContentLength: input.contentLength,
      }),
    );
  }

  async getBytes(key: string): Promise<Uint8Array> {
    const result = await this.client.send(
      new GetObjectCommand({ Bucket: this.config.bucket, Key: key }),
    );
    if (!result.Body) {
      throw new Error('Storage object body is empty.');
    }
    return result.Body.transformToByteArray();
  }

  createSignedDownloadUrl(input: {
    key: string;
    contentType?: string;
    fileName?: string;
    expiresInSeconds?: number;
  }) {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: input.key,
        ResponseContentType: input.contentType,
        ResponseContentDisposition: input.fileName
          ? `attachment; filename="${sanitizeFileName(input.fileName)}"`
          : undefined,
      }),
      { expiresIn: input.expiresInSeconds ?? 300 },
    );
  }
}

export function createOriginalDocumentKey(input: {
  organizationId: string;
  documentId: string;
  fileName: string;
}) {
  return `organizations/${input.organizationId}/documents/${input.documentId}/original/${safeKeyFileName(input.fileName)}`;
}

export function createCompletedDocumentKey(input: {
  organizationId: string;
  documentId: string;
  fileName: string;
}) {
  return `organizations/${input.organizationId}/documents/${input.documentId}/completed/${safeKeyFileName(input.fileName)}`;
}

function safeKeyFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function sanitizeFileName(name: string) {
  return name.replace(/["\\\r\n]/g, '_');
}
