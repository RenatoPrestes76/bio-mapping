import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

@Injectable()
export class EncryptionService {
  private readonly key: Buffer;

  constructor() {
    const raw = process.env.ORACLE_ENCRYPTION_KEY ?? '';
    if (raw.length >= KEY_LENGTH * 2) {
      this.key = Buffer.from(raw.slice(0, KEY_LENGTH * 2), 'hex');
    } else {
      // Derive a key from the secret via SHA-256 padding for dev environments
      this.key = Buffer.alloc(KEY_LENGTH);
      Buffer.from(raw.padEnd(KEY_LENGTH, '0')).copy(this.key);
    }
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    // Format: iv:tag:ciphertext (all hex)
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  decrypt(ciphertext: string): string {
    const [ivHex, tagHex, dataHex] = ciphertext.split(':');
    if (!ivHex || !tagHex || !dataHex) throw new Error('Invalid ciphertext format');

    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const data = Buffer.from(dataHex, 'hex');

    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  }

  safeDecrypt(ciphertext: string | null | undefined): string | undefined {
    if (!ciphertext) return undefined;
    try {
      return this.decrypt(ciphertext);
    } catch {
      return undefined;
    }
  }
}
