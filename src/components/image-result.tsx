"use client";

import { useState } from "react";

export function ImageResult({ imageUrl }: { imageUrl: string }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border">
        {!loaded && (
          <div className="flex h-64 items-center justify-center bg-muted">
            <p className="text-sm text-muted-foreground">加载图片...</p>
          </div>
        )}
        <img
          src={imageUrl}
          alt="Generated image"
          className={`w-full ${loaded ? "block" : "hidden"}`}
          onLoad={() => setLoaded(true)}
        />
      </div>
      <div className="flex gap-2">
        <a
          href={imageUrl}
          download
          className="inline-flex h-7 items-center justify-center gap-1 rounded-lg border border-border bg-background px-2.5 text-[0.8rem] font-medium hover:bg-muted"
        >
          下载图片
        </a>
      </div>
    </div>
  );
}
