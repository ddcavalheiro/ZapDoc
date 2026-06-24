import { beforeAll, describe, expect, it } from "vitest";
import crypto from "node:crypto";

// Chave de 32 bytes (base64) exigida pelo mfa.ts. Definida antes do import.
beforeAll(() => {
  process.env.MFA_SECRET_KEY = crypto.randomBytes(32).toString("base64");
});

const {
  encryptSecret,
  decryptSecret,
  generateTotpSecret,
  totpUri,
  verifyTotp,
  randomTempPassword,
} = await import("@/lib/mfa");

// Reimplementação mínima do TOTP (RFC 6238) para gerar um código válido no teste,
// independente da lib usada na implementação.
function totpNow(base32: string): string {
  const secret = base32ToBuffer(base32);
  const counter = Math.floor(Date.now() / 1000 / 30);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac("sha1", secret).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const bin =
    ((hmac[offset] & 0x7f) << 24) |
    (hmac[offset + 1] << 16) |
    (hmac[offset + 2] << 8) |
    hmac[offset + 3];
  return (bin % 1_000_000).toString().padStart(6, "0");
}

function base32ToBuffer(input: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const c of input.replace(/=+$/, "").toUpperCase()) {
    const idx = alphabet.indexOf(c);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

describe("encryptSecret / decryptSecret", () => {
  it("faz round-trip do segredo (cifra e decifra)", () => {
    const plain = "JBSWY3DPEHPK3PXP";
    const enc = encryptSecret(plain);
    expect(enc).not.toBe(plain);
    expect(enc.split(":")).toHaveLength(3); // iv:tag:ciphertext
    expect(decryptSecret(enc)).toBe(plain);
  });

  it("gera ciphertext diferente a cada chamada (IV aleatório)", () => {
    const a = encryptSecret("MESMO_SEGREDO");
    const b = encryptSecret("MESMO_SEGREDO");
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe(decryptSecret(b));
  });

  it("rejeita segredo com formato inválido", () => {
    expect(() => decryptSecret("formato-errado")).toThrow();
  });
});

describe("generateTotpSecret / totpUri", () => {
  it("gera segredo base32 e URI otpauth", () => {
    const { secret, uri } = generateTotpSecret("tesoureiro@example.com");
    expect(secret).toMatch(/^[A-Z2-7]+$/);
    expect(uri).toMatch(/^otpauth:\/\/totp\//);
    expect(uri).toContain("ZapDoc");
  });

  it("totpUri embute o email (label)", () => {
    const { secret } = generateTotpSecret("a@b.com");
    expect(totpUri(secret, "a@b.com")).toContain(
      encodeURIComponent("a@b.com"),
    );
  });
});

describe("verifyTotp", () => {
  it("aceita um código válido gerado para o segredo", () => {
    const { secret } = generateTotpSecret("user@example.com");
    expect(verifyTotp(secret, totpNow(secret), "user@example.com")).toBe(true);
  });

  it("ignora espaços/caracteres não numéricos no código", () => {
    const { secret } = generateTotpSecret("user@example.com");
    const code = totpNow(secret);
    const formatado = `${code.slice(0, 3)} ${code.slice(3)}`;
    expect(verifyTotp(secret, formatado, "user@example.com")).toBe(true);
  });

  it("rejeita código com tamanho diferente de 6 dígitos", () => {
    const { secret } = generateTotpSecret("user@example.com");
    expect(verifyTotp(secret, "123")).toBe(false);
    expect(verifyTotp(secret, "1234567")).toBe(false);
  });

  it("rejeita um código incorreto", () => {
    const { secret } = generateTotpSecret("user@example.com");
    expect(verifyTotp(secret, "000000", "user@example.com")).toBe(false);
  });
});

describe("randomTempPassword", () => {
  it("respeita o tamanho pedido", () => {
    expect(randomTempPassword(12)).toHaveLength(12);
    expect(randomTempPassword(20)).toHaveLength(20);
  });

  it("usa apenas o alfabeto sem caracteres ambíguos", () => {
    const pwd = randomTempPassword(200);
    expect(pwd).not.toMatch(/[O0Il1]/); // ambíguos excluídos
    expect(pwd).toMatch(/^[A-Za-z2-9]+$/);
  });

  it("gera senhas distintas", () => {
    expect(randomTempPassword()).not.toBe(randomTempPassword());
  });
});
