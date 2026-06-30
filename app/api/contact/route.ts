import { NextResponse } from "next/server";
import { createErrorBody } from "../../lib/api-error";
import { checkRateLimit } from "../../lib/rate-limit";
import { supabaseServer } from "../../lib/supabase-server";

const REQUEST_TYPES = ["delete_request", "bug_report", "general"] as const;
const MAX_CONTACT_LENGTH = 200;
const MAX_SPOTIFY_NAME_LENGTH = 120;
const MAX_MESSAGE_LENGTH = 2000;

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

function getClientKey(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim();

  return ip ? `contact:${ip}` : "contact:unknown";
}

export async function POST(request: Request) {
  const rateLimit = checkRateLimit({
    key: getClientKey(request),
    limit: 5,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: `短時間に送信が続いています。${rateLimit.retryAfterSeconds}秒後にもう一度試してください。`,
      },
      { status: 429 }
    );
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

  // 問い合わせ本文だけを必須にして、返信先などの個人情報は任意入力にする
  const { error } = await supabaseServer.from("contact_requests").insert({
    request_type: requestType,
    contact: cleanOptionalText(payload.contact, MAX_CONTACT_LENGTH),
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
