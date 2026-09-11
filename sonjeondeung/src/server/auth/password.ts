// 비밀번호 해싱 — Node 내장 scrypt (외부 의존성 없음, OWASP 권장 파라미터).
// 저장 형식: "scrypt$N$r$p$<salt b64url>$<hash b64url>". 알고리즘 접두사가 있어 나중에 argon2 등으로 교체해도 기존 해시를 검증·재해싱할 수 있다.
import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";

// promisify는 options 오버로드 타입을 잃어버리므로 직접 감싼다
function scrypt(password: string, salt: Buffer, keylen: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(password, salt, keylen, options, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

const ALGO = "scrypt";
const SCRYPT_N = 16384; // 2^14 — 서버리스 콜드스타트를 고려한 값 (OWASP 최소 권장)
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 64;
const SALT_LEN = 16;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LEN);
  const key = await scrypt(password.normalize("NFKC"), salt, KEY_LEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
  return [ALGO, SCRYPT_N, SCRYPT_R, SCRYPT_P, salt.toString("base64url"), key.toString("base64url")].join("$");
}

/** 형식이 깨졌거나 알고리즘이 다르면 false (throw 하지 않음) */
export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== ALGO) return false;
  const [, nStr, rStr, pStr, saltB64, hashB64] = parts;
  const N = Number(nStr);
  const r = Number(rStr);
  const p = Number(pStr);
  if (![N, r, p].every(Number.isInteger)) return false;
  const expected = Buffer.from(hashB64, "base64url");
  if (expected.length === 0) return false;
  try {
    const actual = await scrypt(password.normalize("NFKC"), Buffer.from(saltB64, "base64url"), expected.length, { N, r, p });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/**
 * 존재하지 않는 계정으로 로그인 시도할 때도 같은 시간이 걸리도록 검증할 더미 해시.
 * (응답 시간으로 계정 존재 여부를 유추하는 것을 막는다)
 */
let dummyHashPromise: Promise<string> | null = null;
export function getDummyHash(): Promise<string> {
  if (!dummyHashPromise) dummyHashPromise = hashPassword(randomBytes(16).toString("hex"));
  return dummyHashPromise;
}
