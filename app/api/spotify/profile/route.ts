import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createErrorBody } from "../../../lib/api-error";

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("spotify_access_token")?.value;

  if (!accessToken) {
    return NextResponse.json(
      { error: "Spotifyログイン情報が見つかりません。もう一度ログインしてください。" },
      { status: 401 }
    );
  }

  const profileResponse = await fetch("https://api.spotify.com/v1/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
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
