export type UploadObjectInput = {
  key: string;
  body: Buffer;
  contentType: string;
  contentLength?: number;
};

export type CreateSignedUrlInput = {
  key: string;
  fileName?: string;
  contentType?: string;
  expiresInSeconds?: number;
};
