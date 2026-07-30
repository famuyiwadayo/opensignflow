import { decryptPayload, encryptPayload } from './index';

const key = Buffer.alloc(32, 7).toString('base64');

describe('AES-256-GCM outbox payload encryption', () => {
  it('round-trips plaintext while retaining the key version', () => {
    const encrypted = encryptPayload({
      plaintext: 'signing-token-secret',
      base64Key: key,
      keyVersion: 'test-v1',
    });
    expect(encrypted.keyVersion).toBe('test-v1');
    expect(encrypted.ciphertext).not.toContain('signing-token-secret');
    expect(decryptPayload({ ...encrypted, base64Key: key })).toBe('signing-token-secret');
  });

  it('uses a distinct initialization vector for each encryption', () => {
    const first = encryptPayload({
      plaintext: 'same payload',
      base64Key: key,
      keyVersion: 'test-v1',
    });
    const second = encryptPayload({
      plaintext: 'same payload',
      base64Key: key,
      keyVersion: 'test-v1',
    });
    expect(first.initializationVector).not.toBe(second.initializationVector);
    expect(first.ciphertext).not.toBe(second.ciphertext);
  });

  it('rejects tampered ciphertext', () => {
    const encrypted = encryptPayload({
      plaintext: 'sensitive',
      base64Key: key,
      keyVersion: 'test-v1',
    });
    expect(() =>
      decryptPayload({
        ...encrypted,
        ciphertext: Buffer.from('tampered').toString('base64'),
        base64Key: key,
      }),
    ).toThrow();
  });

  it('rejects keys that do not decode to 32 bytes', () => {
    expect(() =>
      encryptPayload({
        plaintext: 'payload',
        base64Key: Buffer.alloc(16).toString('base64'),
        keyVersion: 'test-v1',
      }),
    ).toThrow('exactly 32 bytes');
  });
});
