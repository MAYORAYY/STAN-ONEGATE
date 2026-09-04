import { encrypt, decrypt } from "./crypto";

describe("crypto util", () => {
  beforeAll(() => {
    process.env.SESSION_ENCRYPTION_KEY = "0".repeat(64);
  });

  it("mengembalikan nilai yang sama setelah encrypt lalu decrypt", () => {
    const original = "ci_session_abc123";
    expect(decrypt(encrypt(original))).toBe(original);
  });

  it("menghasilkan ciphertext berbeda tiap kali dipanggil karena IV acak", () => {
    const original = "sesskey_xyz789";
    expect(encrypt(original)).not.toBe(encrypt(original));
  });

  it("melempar error kalau authTag dimodifikasi", () => {
    const encrypted = encrypt("some_session_token");
    const buffer = Buffer.from(encrypted, "base64");
    buffer[15] = buffer[15] ^ 0xff;
    const tampered = buffer.toString("base64");

    expect(() => decrypt(tampered)).toThrow();
  });
});