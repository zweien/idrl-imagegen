import { NextRequest, NextResponse } from "next/server";
import { getTask } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const task = getTask(id);

  if (!task) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: task.id,
    prompt: task.prompt,
    width: task.width,
    height: task.height,
    enhancement: !!task.enhancement,
    status: task.status,
    imageUrl:
      task.status === "completed" && task.image_path
        ? `/api/images/${task.image_path}`
        : null,
    error: task.error,
    createdAt: task.created_at,
    completedAt: task.completed_at,
  });
}
