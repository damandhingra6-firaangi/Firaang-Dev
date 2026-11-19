import { getInstagramReelFeed } from "@/lib/instagram-reels";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await getInstagramReelFeed(), {
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}
