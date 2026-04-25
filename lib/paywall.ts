import crypto from "node:crypto";

export const PAYWALL_COOKIE_NAME = "prompt_ab_access";
export const PAYWALL_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

type AccessPayload = {
  email: string;
  exp: number;
};

function getSecret() {
  return process.env.PAYWALL_COOKIE_SECRET ?? "local-dev-secret";
}

function sign(data: string) {
  return crypto.createHmac("sha256", getSecret()).update(data).digest("base64url");
}

export function createAccessToken(email: string) {
  const payload: AccessPayload = {
    email,
    exp: Math.floor(Date.now() / 1000) + PAYWALL_COOKIE_MAX_AGE_SECONDS,
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyAccessToken(token: string | undefined) {
  if (!token || !token.includes(".")) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  const parsedPayload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as AccessPayload;
  if (!parsedPayload.email || parsedPayload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return parsedPayload;
}
