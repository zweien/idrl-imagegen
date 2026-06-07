"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TaskStatus } from "@/components/task-status";

const SIZE_OPTIONS = [
  { value: "landscape", label: "横版 (1264×848)" },
  { value: "portrait", label: "竖版 (848×1264)" },
  { value: "square", label: "方形 (1024×1024)" },
  { value: "widescreen", label: "宽屏 (1920×1080)" },
] as const;

export function GenerateForm() {
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState<string>("landscape");
  const [enhancement, setEnhancement] = useState(true);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || submitting) return;

    setSubmitting(true);
    setTaskId(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          size,
          enhancement,
        }),
      });

      const data = await res.json();
      if (data.taskId) {
        setTaskId(data.taskId);
      }
    } catch (err) {
      console.error("Submit failed:", err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium">提示词</label>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="描述你想要生成的图片..."
            rows={4}
            className="resize-none"
          />
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">尺寸</label>
            <select
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              {SIZE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="enhancement"
              checked={enhancement}
              onChange={(e) => setEnhancement(e.target.checked)}
              className="h-4 w-4 rounded border"
            />
            <label htmlFor="enhancement" className="text-sm">
              提示词增强
            </label>
          </div>

          <Button type="submit" disabled={!prompt.trim() || submitting}>
            {submitting ? "提交中..." : "生成图片"}
          </Button>
        </div>
      </form>

      {taskId && <TaskStatus taskId={taskId} />}
    </div>
  );
}
