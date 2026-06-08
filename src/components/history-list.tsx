"use client";

import { useEffect, useState } from "react";
import { MODELS } from "@/lib/types";
import { ImagePreview } from "@/components/image-preview";

interface HistoryItem {
  id: string;
  prompt: string;
  width: number;
  height: number;
  enhancement: boolean;
  model: string;
  status: string;
  imageUrl: string | null;
  enhancedPrompt: string | null;
  createdAt: string;
}

export function HistoryList() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<HistoryItem | null>(null);
  const limit = 20;

  useEffect(() => {
    fetchHistory(page);
  }, [page]);

  async function fetchHistory(p: number) {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks?page=${p}&limit=${limit}`);
      const data = await res.json();
      setItems(data.tasks || []);
      setTotal(data.total || 0);
    } catch {
      console.error("Failed to fetch history");
    } finally {
      setLoading(false);
    }
  }

  const totalPages = Math.ceil(total / limit);

  if (loading) {
    return <p className="text-center text-muted-foreground">加载中...</p>;
  }

  if (items.length === 0) {
    return (
      <p className="text-center text-muted-foreground">
        还没有生成记录，去<a href="/" className="underline">生图</a>吧
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="cursor-pointer overflow-hidden rounded-lg border"
            onClick={() => setSelected(item)}
          >
            <div className="relative">
              {item.status === "completed" && item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.prompt}
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <div className="flex aspect-square items-center justify-center bg-muted">
                  <span className="text-xs text-muted-foreground">
                    {item.status === "failed" ? "失败" : "处理中"}
                  </span>
                </div>
              )}
              {MODELS[item.model] && (
                <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                  {MODELS[item.model].label}
                </span>
              )}
            </div>
            <div className="p-2">
              <p className="line-clamp-2 text-xs text-muted-foreground">
                {item.prompt}
              </p>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
            className="rounded border px-3 py-1 text-sm disabled:opacity-50"
          >
            上一页
          </button>
          <span className="px-3 py-1 text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages}
            className="rounded border px-3 py-1 text-sm disabled:opacity-50"
          >
            下一页
          </button>
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-background p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {selected.imageUrl && (
              <ImagePreview
                src={selected.imageUrl}
                alt={selected.prompt}
                className="w-full rounded"
              />
            )}
            <div className="mt-3 space-y-1 text-sm">
              <p><strong>提示词：</strong>{selected.prompt}</p>
              {selected.enhancedPrompt && (
                <p><strong>增强提示词：</strong>{selected.enhancedPrompt}</p>
              )}
              <p><strong>尺寸：</strong>{selected.width}×{selected.height}</p>
              <p><strong>模型：</strong>{MODELS[selected.model]?.label || selected.model}</p>
              <p><strong>增强：</strong>{selected.enhancement ? "是" : "否"}</p>
              <p><strong>时间：</strong>{selected.createdAt}</p>
            </div>
            <div className="mt-3 flex gap-2">
              {selected.imageUrl && (
                <a
                  href={selected.imageUrl}
                  download
                  className="rounded-md bg-foreground px-3 py-1.5 text-sm text-background"
                >
                  下载
                </a>
              )}
              <button
                onClick={() => setSelected(null)}
                className="rounded-md border px-3 py-1.5 text-sm"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
