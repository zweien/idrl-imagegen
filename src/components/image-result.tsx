"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

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
        <Button variant="outline" size="sm" asChild>
          <a href={imageUrl} download>
            下载图片
          </a>
        </Button>
      </div>
    </div>
  );
}
