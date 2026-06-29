import { NextRequest, NextResponse } from "next/server";
import { createErrorBody } from "../../../lib/api-error";
import { supabaseServer } from "../../../lib/supabase-server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;

  const { data: room, error } = await supabaseServer
    .from("rooms")
    .select(
      `
      id,
      status,
      created_at,
      host:host_user_id (
        id,
        display_name,
        spotify_user_id
      ),
      guest:guest_user_id (
        id,
        display_name,
        spotify_user_id
      )
    `
    )
    .eq("id", roomId)
    .single();

  if (error) {
    return NextResponse.json(
      createErrorBody("招待ルームの取得に失敗しました。", error.message),
      { status: 500 }
    );
  }

  return NextResponse.json({ room });
}
