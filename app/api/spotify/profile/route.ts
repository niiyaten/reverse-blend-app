import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createErrorBody } from "../../../lib/api-error";
import {
  SESSION_COOKIE_NAME,
  verifyAppSessionCookieValue,
} from "../../../lib/session";
import { supabaseServer } from "../../../lib/supabase-server";
import { decryptToken } from "../../../lib/token-crypto";

export async function GET() {
  const cookieStore = await cookies();
  const appUserId = verifyAppSessionCookieValue(
    cookieStore.get(SESSION_COOKIE_NAME)?.value
  );

  if (!appUserId) {
    return NextResponse.json(
      { error: "Spotifyログイン情報が見つかりません。もう一度ログインしてください。" },
      { status: 401 }
    );
  }

  const { data: user, error: userError } = await supabaseServer
    .from("users")
    .select("access_token")
    .eq("id", appUserId)
    .single();

  if (userError || !user) {
    return NextResponse.json(
      createErrorBody("ログインユーザー情報の取得に失敗しました。", userError?.message),
      { status: 500 }
    );
  }

  const profileResponse = await fetch("https://api.spotify.com/v1/me", {
    headers: {
      Authorization: `Bearer ${decryptToken(user.access_token)}`,
    },
  });

  if (!profileResponse.ok) {
    const errorText = await profileResponse.text();

    return NextResponse.json(
      createErrorBody(
        "Spotifyプロフィールの取得に失敗しました。",
        errorText
      ),
      { status: 500 }
    );
  }

  const profile = await profileResponse.json();

  return NextResponse.json({
    id: profile.id,
    display_name: profile.display_name,
  });
}
