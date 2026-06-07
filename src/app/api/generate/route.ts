import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { insertTask } from "@/lib/db";
import { imageQueue } from "@/lib/queue";
import { SIZE_OPTIONS, MODELS, DEFAULT_MODEL, type SizeKey } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, size = "landscape", enhancement = true, model = DEFAULT_MODEL, enhancedPrompt } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "prompt is required" },
        { status: 400 }
      );
    }

    if (!MODELS[model]) {
      return NextResponse.json(
        { error: `Unknown model: ${model}` },
        { status: 400 }
      );
    }

    const dimensions = SIZE_OPTIONS[(size as SizeKey) || "landscape"] || SIZE_OPTIONS.landscape;
    const taskId = uuidv4();

    insertTask({
      id: taskId,
      prompt: prompt.trim(),
      width: dimensions.width,
      height: dimensions.height,
      enhancement: !!enhancement,
      model,
      enhancedPrompt: enhancedPrompt || undefined,
    });

    const jobData = {
      taskId,
      prompt: (enhancedPrompt || prompt).trim(),
      width: dimensions.width,
      height: dimensions.height,
      enhancement: false,
      model,
    };
    console.log("[generate] queuing job:", JSON.stringify({ taskId, model, size, enhancement }));

    await imageQueue.add("generate", jobData, { attempts: 1 });

    return NextResponse.json({ taskId });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
