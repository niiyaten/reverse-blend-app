import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createErrorBody } from "../../lib/api-error";
import { checkRateLimit } from "../../lib/rate-limit";
import {
  SESSION_COOKIE_NAME,
  verifyAppSessionCookieValue,
} from "../../lib/session";
import { supabaseServer } from "../../lib/supabase-server";

const REQUEST_TYPES = ["delete_request", "bug_report", "general"] as const;
const MAX_CONTACT_LENGTH = 200;
const MAX_SPOTIFY_NAME_LENGTH = 120;
const MAX_MESSAGE_LENGTH = 2000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ContactRequestType = (typeof REQUEST_TYPES)[number];

function isContactRequestType(value: unknown): value is ContactRequestType {
  return typeof value === "string" && REQUEST_TYPES.includes(value as ContactRequestType);
}

function cleanOptionalText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, maxLength);
}

function cleanOptionalEmail(value: unknown) {
  const email = cleanOptionalText(value, MAX_CONTACT_LENGTH);

  if (!email) {
    return null;
  }

  if (!EMAIL_PATTERN.test(email)) {
    throw new Error("返信先メールアドレスの形式が正しくありません。");
  }

  return email;
}

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() ?? null;
}

function createRateLimitError(retryAfterSeconds: number) {
  return NextResponse.json(
    {
      error: `短時間に送信が続いています。${retryAfterSeconds}秒後にもう一度試してください。`,
    },
    { status: 429 }
  );
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const appUserId = verifyAppSessionCookieValue(
    cookieStore.get(SESSION_COOKIE_NAME)?.value
  );
  const clientIp = getClientIp(request);
  const longWindowRateLimit = checkRateLimit({
    key: clientIp ? `contact:ip:${clientIp}` : "contact:ip:unknown",
    limit: 5,
    windowMs: 10 * 60 * 1000,
  });

  if (!longWindowRateLimit.allowed) {
    return createRateLimitError(longWindowRateLimit.retryAfterSeconds);
  }

  const ipRateLimit = checkRateLimit({
    key: clientIp ? `contact:ip-minute:${clientIp}` : "contact:ip-minute:unknown",
    limit: 3,
    windowMs: 60 * 1000,
  });

  if (!ipRateLimit.allowed) {
    return createRateLimitError(ipRateLimit.retryAfterSeconds);
  }

  if (appUserId) {
    const sessionRateLimit = checkRateLimit({
      key: `contact:session-minute:${appUserId}`,
      limit: 3,
      windowMs: 60 * 1000,
    });

    if (!sessionRateLimit.allowed) {
      return createRateLimitError(sessionRateLimit.retryAfterSeconds);
    }
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "送信内容を読み取れませんでした。" },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "送信内容が正しくありません。" },
      { status: 400 }
    );
  }

  const payload = body as Record<string, unknown>;
  const requestType = payload.requestType;
  const message =
    typeof payload.message === "string" ? payload.message.trim() : "";

  if (!isContactRequestType(requestType)) {
    return NextResponse.json(
      { error: "問い合わせ種別を選択してください。" },
      { status: 400 }
    );
  }

  if (!message) {
    return NextResponse.json(
      { error: "問い合わせ内容を入力してください。" },
      { status: 400 }
    );
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `問い合わせ内容は${MAX_MESSAGE_LENGTH}文字以内で入力してください。` },
      { status: 400 }
    );
  }

  let contactEmail: string | null;

  try {
    contactEmail = cleanOptionalEmail(payload.contact);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "返信先メールアドレスの形式が正しくありません。",
      },
      { status: 400 }
    );
  }

  // 問い合わせ本文だけを必須にして、返信先メールアドレスは任意入力にする
  const { error } = await supabaseServer.from("contact_requests").insert({
    request_type: requestType,
    contact: contactEmail,
    spotify_display_name: cleanOptionalText(
      payload.spotifyDisplayName,
      MAX_SPOTIFY_NAME_LENGTH
    ),
    message,
    user_agent: cleanOptionalText(request.headers.get("user-agent"), 500),
  });

  if (error) {
    return NextResponse.json(
      createErrorBody("問い合わせの保存に失敗しました。", error.message),
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: "問い合わせを受け付けました。",
  });
}
