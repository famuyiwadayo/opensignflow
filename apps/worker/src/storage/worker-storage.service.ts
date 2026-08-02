import { Injectable } from '@nestjs/common';
import { ObjectStorage } from '@opensignflow/storage';

@Injectable()
export class WorkerStorageService {
  private readonly storage: ObjectStorage;
  constructor() {
    this.storage = new ObjectStorage({
      bucket: required('S3_BUCKET'),
      region: process.env.S3_REGION ?? 'us-east-1',
      endpoint: process.env.S3_ENDPOINT,
      accessKeyId: required('S3_ACCESS_KEY_ID'),
      secretAccessKey: required('S3_SECRET_ACCESS_KEY'),
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    });
  }
  getBytes(key: string) {
    return this.storage.getBytes(key);
  }
  upload(input: { key: string; body: Uint8Array; contentType: string; contentLength?: number }) {
    return this.storage.upload(input);
  }
}
function required(key: string) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} is required to initialize worker object storage.`);
  }
  return value;
}
