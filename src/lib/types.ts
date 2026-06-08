export type GenerationStatus = "submitted" | "queued" | "processing" | "completed" | "failed";

export interface GenerationTurn {
  id: string;
  prompt: string;
  size: string;
  enhancement: boolean;
  status: GenerationStatus;
  taskId: string | null;
  imageUrl: string | null;
  enhancedPrompt: string | null;
  error: string | null;
}

export const SIZE_OPTIONS = {
  landscape: { width: 1264, height: 848 },
  portrait: { width: 848, height: 1264 },
  square: { width: 1024, height: 1024 },
  widescreen: { width: 1920, height: 1080 },
} as const;

export type SizeKey = keyof typeof SIZE_OPTIONS;

export interface ModelConfig {
  id: string;
  label: string;
  description: string;
  supportsEnhancement: boolean;
  outputNodeId: string;
  enhanceOutputNodeId?: string;
  dimensionAlignment: number;
}

export const DEFAULT_MODEL = "ernie-turbo";

export const MODELS: Record<string, ModelConfig> = {
  "ernie-turbo": {
    id: "ernie-turbo",
    label: "ERNIE Turbo",
    description: "8步快速出图",
    supportsEnhancement: true,
    outputNodeId: "73",
    enhanceOutputNodeId: "103",
    dimensionAlignment: 16,
  },
  "ernie": {
    id: "ernie",
    label: "ERNIE Image",
    description: "50步高质量出图",
    supportsEnhancement: true,
    outputNodeId: "73",
    enhanceOutputNodeId: "103",
    dimensionAlignment: 16,
  },
  hidream: {
    id: "hidream",
    label: "HiDream O1",
    description: "28步高质量出图",
    supportsEnhancement: false,
    outputNodeId: "9",
    dimensionAlignment: 32,
  },
  "flux-schnell": {
    id: "flux-schnell",
    label: "FLUX Schnell",
    description: "4步极速出图",
    supportsEnhancement: false,
    outputNodeId: "9",
    dimensionAlignment: 16,
  },
  "qwen-image": {
    id: "qwen-image",
    label: "Qwen Image",
    description: "20步出图",
    supportsEnhancement: false,
    outputNodeId: "9",
    dimensionAlignment: 16,
  },
};

export type ModelId = keyof typeof MODELS;
