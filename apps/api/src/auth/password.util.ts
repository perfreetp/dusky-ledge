import { createHash } from 'node:crypto';

/** 开发期轻量口令哈希（生产应替换为 bcrypt/argon2，接口保持不变） */
export function hashPassword(password: string): string {
  return createHash('sha256').update(`pg-salt:${password}`).digest('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}
