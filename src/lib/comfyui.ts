const COMFYUI_URL = process.env.COMFYUI_URL || "http://192.168.1.39:8189";

export interface ComfyUIHistoryOutput {
  images?: Array<{
    filename: string;
    subfolder: string;
    type: string;
  }>;
}

export interface ComfyUIHistoryItem {
  status: {
    status_str: string;
    completed: boolean;
    messages?: string[][];
  };
  outputs: Record<string, ComfyUIHistoryOutput>;
}

export async function submitPrompt(
  workflow: Record<string, unknown>
): Promise<string> {
  const res = await fetch(`${COMFYUI_URL}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: workflow }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`ComfyUI submit failed (${res.status}): ${error}`);
  }

  const data = (await res.json()) as { prompt_id: string };
  return data.prompt_id;
}

export async function getHistory(
  promptId: string
): Promise<ComfyUIHistoryItem | null> {
  const res = await fetch(`${COMFYUI_URL}/history/${promptId}`);
  if (!res.ok) return null;

  const data = (await res.json()) as Record<string, ComfyUIHistoryItem>;
  return data[promptId] || null;
}

export async function pollUntilComplete(
  promptId: string,
  maxWaitMs = 300000
): Promise<ComfyUIHistoryItem> {
  const start = Date.now();

  while (Date.now() - start < maxWaitMs) {
    const history = await getHistory(promptId);

    if (!history) {
      await sleep(2000);
      continue;
    }

    if (history.status.completed) return history;

    if (history.status.status_str === "error") {
      throw new Error(
        `ComfyUI execution error: ${JSON.stringify(history.status.messages)}`
      );
    }

    await sleep(2000);
  }

  throw new Error(`ComfyUI timeout after ${maxWaitMs}ms`);
}

export async function downloadImage(
  filename: string,
  subfolder = "",
  type = "output"
): Promise<Buffer> {
  const params = new URLSearchParams({ filename, subfolder, type });
  const res = await fetch(`${COMFYUI_URL}/view?${params}`);
  if (!res.ok) {
    throw new Error(`Failed to download image: ${res.status}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
