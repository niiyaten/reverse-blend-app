import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("spotify_access_token")?.value;

  if (!accessToken) {
    return NextResponse.json(
      { error: "Spotify access token is missing." },
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
      {
        error: "Failed to get Spotify profile.",
        detail: errorText,
      },
      { status: 500 }
    );
  }

  const profile = await profileResponse.json();

  return NextResponse.json({
    id: profile.id,
    display_name: profile.display_name,
  });
}