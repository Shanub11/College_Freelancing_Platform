"use node";

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

declare const process: {
  env: Record<string, string | undefined>;
};

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SEPARATOR = ":";
const ENCRYPTED_PREFIX = "enc:";

function getKey(): Buffer {
  const hexKey = process.env.MESSAGE_ENCRYPTION_KEY;
  if (!hexKey) {
    console.warn(
      "[Encryption] MESSAGE_ENCRYPTION_KEY not set. Using development fallback key. Set the env var for production."
    );
    return Buffer.from(
      "0000000000000000000000000000000000000000000000000000000000000000",
      "hex"
    );
  }

  if (!/^[0-9a-fA-F]{64}$/.test(hexKey)) {
    throw new Error(
      "MESSAGE_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)."
    );
  }

  return Buffer.from(hexKey, "hex");
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return (
    ENCRYPTED_PREFIX +
    iv.toString("hex") +
    SEPARATOR +
    authTag.toString("hex") +
    SEPARATOR +
    ciphertext.toString("hex")
  );
}

export function decrypt(value: string): string {
  if (!value.startsWith(ENCRYPTED_PREFIX)) {
    return value;
  }

  const parts = value.slice(ENCRYPTED_PREFIX.length).split(SEPARATOR);
  if (parts.length !== 3) {
    console.error("[Encryption] Invalid encrypted value format. Returning as-is.");
    return value;
  }

  try {
    const [ivHex, authTagHex, ciphertextHex] = parts;
    const decipher = createDecipheriv(
      ALGORITHM,
      getKey(),
      Buffer.from(ivHex, "hex")
    );
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(ciphertextHex, "hex")),
      decipher.final(),
    ]);
    return plaintext.toString("utf8");
  } catch (error) {
    console.error("[Encryption] Decryption failed:", error);
    return value;
  }
}

export function isEncrypted(value: string): boolean {
  return value.startsWith(ENCRYPTED_PREFIX);
}
