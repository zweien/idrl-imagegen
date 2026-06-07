import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { insertTask } from "@/lib/db";
import { imageQueue } from "@/lib/queue";

const SIZE_OPTIONS: Record<string, { width: number; height: number }> = {
  landscape: { width: 1264, height: 848 },
  portrait: { width: 848, height: 1264 },
  square: { width: 1024, height: 1024 },
  widescreen: { width: 1920, height: 1080 },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, size = "landscape", enhancement = true } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "prompt is required" },
        { status: 400 }
      );
    }

    const dimensions = SIZE_OPTIONS[size] || SIZE_OPTIONS.landscape;
    const taskId = uuidv4();

    insertTask({
      id: taskId,
      prompt: prompt.trim(),
      width: dimensions.width,
      height: dimensions.height,
      enhancement: !!enhancement,
    });

    await imageQueue.add(
      "generate",
      {
        taskId,
        prompt: prompt.trim(),
        width: dimensions.width,
        height: dimensions.height,
        enhancement: !!enhancement,
      },
      { attempts: 1 }
    );

    return NextResponse.json({ taskId });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
