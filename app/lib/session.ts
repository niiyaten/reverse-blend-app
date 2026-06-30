import { createHmac, timingSafeEqual } from "crypto";

const SESSION_COOKIE_NAME = "app_session";

function getSessionSecret() {
  const secret = process.env.APP_SESSION_SECRET ?? process.env.SPOTIFY_CLIENT_SECRET;

  if (!secret) {
    throw new Error("Session secret is missing.");
  }

  return secret;
}

function signValue(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

export function createAppSessionCookieValue(userId: string) {
  return `${userId}.${signValue(userId)}`;
}

export function verifyAppSessionCookieValue(cookieValue?: string) {
  if (!cookieValue) {
    return null;
  }

  const separatorIndex = cookieValue.lastIndexOf(".");

  if (separatorIndex <= 0) {
    return null;
  }

  const userId = cookieValue.slice(0, separatorIndex);
  const signature = cookieValue.slice(separatorIndex + 1);
  const expectedSignature = signValue(userId);
  const signatureBuffer = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedSignatureBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(signatureBuffer, expectedSignatureBuffer)) {
    return null;
  }

  return userId;
}

export { SESSION_COOKIE_NAME };
