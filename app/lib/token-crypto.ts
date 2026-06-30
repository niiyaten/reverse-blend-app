import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";

function getTokenEncryptionKey() {
  const secret =
    process.env.APP_TOKEN_ENCRYPTION_SECRET ??
    process.env.APP_SESSION_SECRET ??
    process.env.SPOTIFY_CLIENT_SECRET;

  if (!secret) {
    throw new Error("Token encryption secret is missing.");
  }

  return createHash("sha256").update(secret).digest();
}

export function encryptToken(token?: string | null) {
  if (!token) {
    return null;
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getTokenEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    "v1",
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptToken(encryptedToken: string) {
  const [version, ivText, authTagText, encryptedText] = encryptedToken.split(".");

  if (version !== "v1" || !ivText || !authTagText || !encryptedText) {
    throw new Error("Stored Spotify token is not encrypted with the current format.");
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    getTokenEncryptionKey(),
    Buffer.from(ivText, "base64url")
  );

  decipher.setAuthTag(Buffer.from(authTagText, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedText, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
