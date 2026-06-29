import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createErrorBody } from "../../../lib/api-error";
import { supabaseServer } from "../../../lib/supabase-server";

export async function POST() {
  const cookieStore = await cookies();
  const appUserId = cookieStore.get("app_user_id")?.value;
  const appUrl = process.env.APP_URL;

  if (!appUserId) {
    return NextResponse.json(
      { error: "ログインユーザー情報がありません。もう一度Spotifyログインしてください。" },
      { status: 401 }
    );
  }

  if (!appUrl) {
    return NextResponse.json(
      { error: "アプリのURL設定が不足しています。" },
      { status: 500 }
    );
  }

  // roomsテーブルに招待ルームを作成する
  const { data: room, error } = await supabaseServer
    .from("rooms")
    .insert({
      host_user_id: appUserId,
      status: "waiting",
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      createErrorBody("招待ルームの作成に失敗しました。", error.message),
      { status: 500 }
    );
  }

  return NextResponse.json({
    roomId: room.id,
    roomUrl: `${appUrl}/room/${room.id}`,
  });
}
