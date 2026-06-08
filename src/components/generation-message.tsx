"use client";

import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { ImagePreview } from "@/components/image-preview";

interface ImageGenerationProps {
  taskId: string;
}

export function ImageGeneration({ taskId }: ImageGenerationProps) {
  const [status, setStatus] = useState<string>("queued");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [enhancedPrompt, setEnhancedPrompt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    if (status === "completed" || status === "failed") return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/tasks/${taskId}`);
        const data = await res.json();

        if (data.status) setStatus(data.status);
        if (data.imageUrl) setImageUrl(data.imageUrl);
        if (data.enhancedPrompt) setEnhancedPrompt(data.enhancedPrompt);
        if (data.error) setError(data.error);
      } catch {
        // retry on next interval
      }
    };

    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [taskId, status]);

  if (status === "failed") {
    return (
      <div className="rounded-lg border border-destructive p-4">
        <p className="font-medium text-destructive">生成失败</p>
        {error && <p className="mt-1 text-sm text-muted-foreground">{error}</p>}
      </div>
    );
  }

  if (status === "completed" && imageUrl) {
    return (
      <div className="space-y-3">
        <div className="overflow-hidden rounded-lg border">
          {!imageLoaded && (
            <div className="flex aspect-video items-center justify-center bg-muted">
              <Spinner />
            </div>
          )}
          {imageLoaded ? (
            <ImagePreview src={imageUrl} alt="Generated image" />
          ) : (
            <img
              src={imageUrl}
              alt="Generated image"
              className="hidden"
              onLoad={() => setImageLoaded(true)}
            />
          )}
        </div>
        {enhancedPrompt && (
          <div className="rounded-lg border p-3">
            <p className="mb-1 text-sm font-medium">增强后的提示词</p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {enhancedPrompt}
            </p>
          </div>
        )}
        <div className="flex gap-2">
          <a
            href={imageUrl}
            download
            className="rounded-md bg-foreground px-3 py-1.5 text-sm text-background"
          >
            下载图片
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Spinner />
        <span className="text-sm">
          {status === "queued" ? "排队中..." : "正在生成图片..."}
        </span>
      </div>
      <div className="aspect-video w-full animate-pulse rounded-lg bg-muted" />
    </div>
  );
}
