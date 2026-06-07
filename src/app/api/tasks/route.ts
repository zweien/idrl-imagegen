import { NextRequest, NextResponse } from "next/server";
import { getTasks } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));

  const result = getTasks(page, limit);

  return NextResponse.json({
    tasks: result.tasks.map((t) => ({
      id: t.id,
      prompt: t.prompt,
      width: t.width,
      height: t.height,
      enhancement: !!t.enhancement,
      status: t.status,
      imageUrl:
        t.status === "completed" && t.image_path
          ? `/api/images/${t.image_path}`
          : null,
      createdAt: t.created_at,
    })),
    total: result.total,
    page,
    limit,
  });
}
