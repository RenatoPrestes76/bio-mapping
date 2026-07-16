import { EncryptionService } from '../services/encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(() => {
    process.env.ORACLE_ENCRYPTION_KEY = 'test-key-padded-for-aes-256-gcm-enc';
    service = new EncryptionService();
  });

  it('encrypt produces a non-empty string different from input', () => {
    const cipher = service.encrypt('my-access-token');
    expect(cipher).not.toBe('my-access-token');
    expect(cipher.length).toBeGreaterThan(0);
  });

  it('decrypt recovers original plaintext', () => {
    const plaintext = 'super-secret-token-abc123';
    const cipher = service.encrypt(plaintext);
    expect(service.decrypt(cipher)).toBe(plaintext);
  });

  it('two encryptions of same value produce different ciphertexts (random IV)', () => {
    const a = service.encrypt('same-value');
    const b = service.encrypt('same-value');
    expect(a).not.toBe(b);
  });

  it('safeDecrypt returns undefined for null input', () => {
    expect(service.safeDecrypt(null)).toBeUndefined();
  });

  it('safeDecrypt returns undefined for invalid ciphertext', () => {
    expect(service.safeDecrypt('not:a:valid:cipher:text')).toBeUndefined();
  });

  it('safeDecrypt recovers valid ciphertext', () => {
    const cipher = service.encrypt('token-xyz');
    expect(service.safeDecrypt(cipher)).toBe('token-xyz');
  });
});
