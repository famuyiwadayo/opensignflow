import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export type EncryptedPayload = {
  keyVersion: string;
  initializationVector: string;
  authenticationTag: string;
  ciphertext: string;
};

/** AES-256-GCM envelope for durable sensitive job payloads such as signing tokens. */
export function encryptPayload(input: {
  plaintext: string;
  base64Key: string;
  keyVersion: string;
}): EncryptedPayload {
  const key = decodeKey(input.base64Key);
  const initializationVector = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, initializationVector);
  const ciphertext = Buffer.concat([cipher.update(input.plaintext, 'utf8'), cipher.final()]);
  return {
    keyVersion: input.keyVersion,
    initializationVector: initializationVector.toString('base64'),
    authenticationTag: cipher.getAuthTag().toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  };
}

export function decryptPayload(input: EncryptedPayload & { base64Key: string }): string {
  const decipher = createDecipheriv(
    'aes-256-gcm',
    decodeKey(input.base64Key),
    Buffer.from(input.initializationVector, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(input.authenticationTag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(input.ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

function decodeKey(base64Key: string): Buffer {
  const key = Buffer.from(base64Key, 'base64');
  if (key.length !== 32) throw new Error('Outbox encryption key must decode to exactly 32 bytes.');
  return key;
}
