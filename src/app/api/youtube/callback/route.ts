import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, getChannelInfo } from "@/core/youtube/uploader";
import { upsertYouTubeTokens } from "@/lib/supabase-actions";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  if (!code) {
    return NextResponse.redirect(`${appUrl}/settings?error=no_code`);
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(`${appUrl}/auth?error=not_authenticated`);
    }

    const tokens = await exchangeCodeForTokens(code);
    const channel = await getChannelInfo(tokens.access_token, tokens.refresh_token);

    await upsertYouTubeTokens(tokens, channel.id);

    return NextResponse.redirect(`${appUrl}/settings?youtube=connected&channel=${encodeURIComponent(channel.name)}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "oauth_failed";
    return NextResponse.redirect(`${appUrl}/settings?error=${encodeURIComponent(message)}`);
  }
}
