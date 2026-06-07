"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { MODELS, DEFAULT_MODEL, type ModelId } from "@/lib/types";

const SIZE_OPTIONS = [
  { value: "landscape", label: "横版 (1264×848)" },
  { value: "portrait", label: "竖版 (848×1264)" },
  { value: "square", label: "方形 (1024×1024)" },
  { value: "widescreen", label: "宽屏 (1920×1080)" },
] as const;

type SizeValue = (typeof SIZE_OPTIONS)[number]["value"];

interface ConfirmInput {
  prompt: string;
  size?: string;
  enhancement?: boolean;
  model?: string;
}

export interface ConfirmParams {
  prompt: string;
  size: SizeValue;
  enhancement: boolean;
  model: string;
  enhancedPrompt?: string;
}

interface GenerationConfirmCardProps {
  input: ConfirmInput;
  onConfirm: (params: ConfirmParams) => void;
  onCancel: () => void;
}

export function GenerationConfirmCard({
  input,
  onConfirm,
  onCancel,
}: GenerationConfirmCardProps) {
  const [prompt, setPrompt] = useState(input.prompt);
  const [size, setSize] = useState<SizeValue>(
    (input.size as SizeValue) || "landscape"
  );
  const [model, setModel] = useState<ModelId>(
    (input.model as ModelId) || DEFAULT_MODEL
  );
  const modelConfig = MODELS[model];
  const canEnhance = modelConfig?.supportsEnhancement ?? false;
  const [enhancement, setEnhancement] = useState(
    canEnhance && input.enhancement !== false
  );
  const [enhancedPrompt, setEnhancedPrompt] = useState<string | null>(null);
  const [enhancing, setEnhancing] = useState(false);
  const [enhanceError, setEnhanceError] = useState<string | null>(null);

  const fetchEnhancedPrompt = useCallback(
    async (currentPrompt: string, currentSize: SizeValue) => {
      setEnhancing(true);
      setEnhanceError(null);
      try {
        const res = await fetch("/api/enhance-prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: currentPrompt, size: currentSize, model }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "增强失败");
        }
        setEnhancedPrompt(data.enhancedPrompt);
      } catch (err) {
        setEnhanceError(
          err instanceof Error ? err.message : "增强提示词获取失败"
        );
      } finally {
        setEnhancing(false);
      }
    },
    [model]
  );

  useEffect(() => {
    if (enhancement) {
      fetchEnhancedPrompt(prompt, size);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleModelChange = (newModel: string | null) => {
    if (!newModel) return;
    setModel(newModel as ModelId);
    const newConfig = MODELS[newModel];
    if (!newConfig?.supportsEnhancement) {
      setEnhancement(false);
    }
  };

  const handleEnhancementChange = (on: boolean) => {
    setEnhancement(on);
    if (on && !enhancedPrompt && !enhancing) {
      fetchEnhancedPrompt(prompt, size);
    }
  };

  const handleReEnhance = () => {
    fetchEnhancedPrompt(prompt, size);
  };

  const handleConfirm = () => {
    onConfirm({
      prompt,
      size,
      model,
      enhancement: !!(enhancement && enhancedPrompt),
      enhancedPrompt: enhancement && enhancedPrompt ? enhancedPrompt : undefined,
    });
  };

  return (
    <div className="not-prose rounded-lg border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <span className="font-medium text-sm">生成图片</span>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
          待确认
        </span>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">
          提示词
        </label>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          className="resize-none text-sm"
        />
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground">
            模型
          </label>
          <Select value={model} onValueChange={handleModelChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(MODELS).map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground">
            尺寸
          </label>
          <Select value={size} onValueChange={(v) => setSize(v as SizeValue)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SIZE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {canEnhance && (
          <div className="flex items-center gap-2">
            <Switch checked={enhancement} onCheckedChange={handleEnhancementChange} />
            <label className="text-sm font-medium text-muted-foreground">
              提示词增强
            </label>
          </div>
        )}
      </div>

      {canEnhance && enhancement && (
        <div className="space-y-2 rounded-md border bg-muted/30 p-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-muted-foreground">
              增强提示词
            </label>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReEnhance}
              disabled={enhancing}
              className="h-7 text-xs"
            >
              {enhancing ? (
                <>
                  <Spinner className="mr-1 size-3" />
                  增强中...
                </>
              ) : (
                "重新增强"
              )}
            </Button>
          </div>
          {enhancing && !enhancedPrompt && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner className="size-3" />
              正在生成增强提示词...
            </div>
          )}
          {enhanceError && (
            <p className="text-xs text-destructive">{enhanceError}</p>
          )}
          {enhancedPrompt && (
            <Textarea
              value={enhancedPrompt}
              onChange={(e) => setEnhancedPrompt(e.target.value)}
              rows={4}
              className="resize-none text-sm"
            />
          )}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>
          取消
        </Button>
        <Button
          size="sm"
          onClick={handleConfirm}
          disabled={!prompt.trim() || (enhancement && enhancing)}
        >
          确认生成
        </Button>
      </div>
    </div>
  );
}
