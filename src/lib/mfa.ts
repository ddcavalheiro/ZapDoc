import "server-only";
import crypto from "node:crypto";
import { Secret, TOTP } from "otpauth";

const ISSUER = "ZapDoc";

/** Lê e valida a chave de cifragem (32 bytes em base64) de MFA_SECRET_KEY. */
function encryptionKey(): Buffer {
  const raw = process.env.MFA_SECRET_KEY;
  if (!raw) {
    throw new Error(
      "MFA_SECRET_KEY não definida. Gere com: openssl rand -base64 32",
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("MFA_SECRET_KEY deve ter 32 bytes (base64 de 32 bytes).");
  }
  return key;
}

/** Cifra o segredo TOTP em repouso (AES-256-GCM). Formato: iv:authTag:ciphertext (base64). */
export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    tag.toString("base64"),
    enc.toString("base64"),
  ].join(":");
}

/** Decifra o segredo TOTP gravado no banco. */
export function decryptSecret(stored: string): string {
  const [ivB64, tagB64, dataB64] = stored.split(":");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Segredo MFA com formato inválido.");
  }
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivB64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]);
  return dec.toString("utf8");
}

function buildTotp(secretBase32: string, email: string): TOTP {
  return new TOTP({
    issuer: ISSUER,
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secretBase32),
  });
}

/** Monta a URI otpauth:// (usada para o QR Code) a partir de um segredo existente. */
export function totpUri(secretBase32: string, email: string): string {
  return buildTotp(secretBase32, email).toString();
}

/** Gera um novo segredo TOTP e a URI otpauth:// (para o QR Code). */
export function generateTotpSecret(email: string): {
  secret: string;
  uri: string;
} {
  const secret = new Secret({ size: 20 });
  return { secret: secret.base32, uri: totpUri(secret.base32, email) };
}

/** Valida um código TOTP de 6 dígitos contra o segredo (janela ±1 período). */
export function verifyTotp(
  secretBase32: string,
  code: string,
  email = ISSUER,
): boolean {
  const normalized = code.replace(/\D/g, "");
  if (normalized.length !== 6) return false;
  const totp = buildTotp(secretBase32, email);
  return totp.validate({ token: normalized, window: 1 }) !== null;
}

const TEMP_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghijkmnpqrstuvwxyz";

/** Senha temporária legível (sem caracteres ambíguos) para o admin repassar. */
export function randomTempPassword(length = 12): string {
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += TEMP_ALPHABET[bytes[i] % TEMP_ALPHABET.length];
  }
  return out;
}
