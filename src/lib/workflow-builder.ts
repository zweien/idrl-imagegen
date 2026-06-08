import { randomInt } from "crypto";
import { MODELS } from "./types";

export interface GenerateParams {
  prompt: string;
  width: number;
  height: number;
  enhancement: boolean;
  seed?: number;
}

const PE_SYSTEM_PROMPT = `<s>[SYSTEM_PROMPT]你是一个专业的文生图 Prompt 增强助手。你将收到用户的简短图片描述及目标生成分辨率，请据此扩写为一段内容丰富、细节充分的视觉描述，以帮助文生图模型生成高质量的图片。仅输出增强后的描述，不要包含任何解释或前缀。[/SYSTEM_PROMPT][INST]{"prompt": "{prompt}", "width": {width}, "height": {height}}[/INST]`;

function buildPePrompt(params: { prompt: string; width: number; height: number }): string {
  return PE_SYSTEM_PROMPT
    .replace("{prompt}", params.prompt)
    .replace("{width}", String(params.width))
    .replace("{height}", String(params.height));
}

export function buildWorkflow(params: GenerateParams): Record<string, unknown> {
  const seed = params.seed ?? randomInt(1, 281474976710655);

  const workflow: Record<string, unknown> = {
    "66": {
      class_type: "UNETLoader",
      inputs: {
        unet_name: "ernie-image-turbo.safetensors",
        weight_dtype: "default",
      },
    },
    "62": {
      class_type: "CLIPLoader",
      inputs: {
        clip_name: "ministral-3-3b.safetensors",
        type: "flux2",
        device: "default",
      },
    },
    "63": {
      class_type: "VAELoader",
      inputs: {
        vae_name: "flux2-vae.safetensors",
      },
    },
    "71": {
      class_type: "EmptyFlux2LatentImage",
      inputs: {
        width: params.width,
        height: params.height,
        batch_size: 1,
      },
    },
    "91": {
      class_type: "ConditioningZeroOut",
      inputs: {
        conditioning: ["67", 0],
      },
    },
    "70": {
      class_type: "KSampler",
      inputs: {
        seed,
        steps: 8,
        cfg: 1,
        sampler_name: "euler",
        scheduler: "simple",
        denoise: 1,
        model: ["66", 0],
        positive: ["67", 0],
        negative: ["91", 0],
        latent_image: ["71", 0],
      },
    },
    "65": {
      class_type: "VAEDecode",
      inputs: {
        samples: ["70", 0],
        vae: ["63", 0],
      },
    },
    "73": {
      class_type: "SaveImage",
      inputs: {
        images: ["65", 0],
        filename_prefix: "Ernie-Image-Turbo",
      },
    },
  };

  if (params.enhancement) {
    const pePrompt = buildPePrompt(params);
    workflow["98"] = {
      class_type: "CLIPLoader",
      inputs: {
        clip_name: "ernie-image-prompt-enhancer.safetensors",
        type: "flux2",
        device: "default",
      },
    };
    workflow["95"] = {
      class_type: "TextGenerate",
      inputs: {
        clip: ["98", 0],
        prompt: pePrompt,
        max_length: 2048,
        sampling_mode: "on",
        "sampling_mode.temperature": 0.6,
        "sampling_mode.top_k": 64,
        "sampling_mode.top_p": 0.8,
        "sampling_mode.min_p": 0.05,
        "sampling_mode.repetition_penalty": 1.05,
        "sampling_mode.seed": randomInt(1, 281474976710655),
      },
    };
    workflow["103"] = {
      class_type: "PreviewAny",
      inputs: {
        source: ["95", 0],
      },
    };
    workflow["67"] = {
      class_type: "CLIPTextEncode",
      inputs: {
        text: ["95", 0],
        clip: ["62", 0],
      },
    };
  } else {
    workflow["67"] = {
      class_type: "CLIPTextEncode",
      inputs: {
        text: params.prompt,
        clip: ["62", 0],
      },
    };
  }

  return workflow;
}

export function buildWorkflowForModel(
  model: string,
  params: GenerateParams
): { workflow: Record<string, unknown>; outputNodeId: string } {
  const alignment = MODELS[model]?.dimensionAlignment ?? 16;
  const aligned = {
    ...params,
    width: Math.floor(params.width / alignment) * alignment || alignment,
    height: Math.floor(params.height / alignment) * alignment || alignment,
  };

  switch (model) {
    case "ernie":
      return { workflow: buildErnieWorkflow(aligned), outputNodeId: "73" };
    case "hidream":
      return { workflow: buildHiDreamWorkflow(aligned), outputNodeId: "9" };
    case "flux-schnell":
      return { workflow: buildFluxSchnellWorkflow(aligned), outputNodeId: "9" };
    case "qwen-image":
      return { workflow: buildQwenImageWorkflow(aligned), outputNodeId: "9" };
    default:
      return { workflow: buildWorkflow(aligned), outputNodeId: "73" };
  }
}

function buildErnieWorkflow(params: GenerateParams): Record<string, unknown> {
  const seed = params.seed ?? randomInt(1, 281474976710655);

  const workflow: Record<string, unknown> = {
    "66": {
      class_type: "UNETLoader",
      inputs: {
        unet_name: "ernie-image.safetensors",
        weight_dtype: "default",
      },
    },
    "62": {
      class_type: "CLIPLoader",
      inputs: {
        clip_name: "ministral-3-3b.safetensors",
        type: "flux2",
        device: "default",
      },
    },
    "63": {
      class_type: "VAELoader",
      inputs: {
        vae_name: "flux2-vae.safetensors",
      },
    },
    "71": {
      class_type: "EmptyFlux2LatentImage",
      inputs: {
        width: params.width,
        height: params.height,
        batch_size: 1,
      },
    },
    "72": {
      class_type: "CLIPTextEncode",
      inputs: {
        text: "",
        clip: ["62", 0],
      },
    },
    "70": {
      class_type: "KSampler",
      inputs: {
        seed,
        steps: 50,
        cfg: 4,
        sampler_name: "euler",
        scheduler: "simple",
        denoise: 1,
        model: ["66", 0],
        positive: ["67", 0],
        negative: ["72", 0],
        latent_image: ["71", 0],
      },
    },
    "65": {
      class_type: "VAEDecode",
      inputs: {
        samples: ["70", 0],
        vae: ["63", 0],
      },
    },
    "73": {
      class_type: "SaveImage",
      inputs: {
        images: ["65", 0],
        filename_prefix: "Ernie-Image",
      },
    },
  };

  if (params.enhancement) {
    const pePrompt = buildPePrompt(params);
    workflow["91"] = {
      class_type: "CLIPLoader",
      inputs: {
        clip_name: "ernie-image-prompt-enhancer.safetensors",
        type: "flux2",
        device: "default",
      },
    };
    workflow["95"] = {
      class_type: "TextGenerate",
      inputs: {
        clip: ["91", 0],
        prompt: pePrompt,
        max_length: 2048,
        sampling_mode: "on",
        "sampling_mode.temperature": 0.6,
        "sampling_mode.top_k": 64,
        "sampling_mode.top_p": 0.8,
        "sampling_mode.min_p": 0.05,
        "sampling_mode.repetition_penalty": 1.05,
        "sampling_mode.seed": randomInt(1, 281474976710655),
      },
    };
    workflow["103"] = {
      class_type: "PreviewAny",
      inputs: {
        source: ["95", 0],
      },
    };
    workflow["67"] = {
      class_type: "CLIPTextEncode",
      inputs: {
        text: ["95", 0],
        clip: ["62", 0],
      },
    };
  } else {
    workflow["67"] = {
      class_type: "CLIPTextEncode",
      inputs: {
        text: params.prompt,
        clip: ["62", 0],
      },
    };
  }

  return workflow;
}

function buildHiDreamWorkflow(params: GenerateParams): Record<string, unknown> {
  const seed = params.seed ?? randomInt(1, 281474976710655);
  return {
    "10": {
      class_type: "CheckpointLoaderSimple",
      inputs: { ckpt_name: "hidream_o1_image_dev_fp8_scaled.safetensors" },
    },
    "6": {
      class_type: "CLIPTextEncode",
      inputs: { text: params.prompt, clip: ["10", 1] },
    },
    "7": {
      class_type: "CLIPTextEncode",
      inputs: { text: "", clip: ["10", 1] },
    },
    "5": {
      class_type: "KSampler",
      inputs: {
        seed,
        steps: 28,
        cfg: 4.5,
        sampler_name: "euler",
        scheduler: "sgm_uniform",
        denoise: 1.0,
        model: ["10", 0],
        positive: ["6", 0],
        negative: ["7", 0],
        latent_image: ["13", 0],
      },
    },
    "13": {
      class_type: "EmptyLatentImage",
      inputs: { width: params.width, height: params.height, batch_size: 1 },
    },
    "8": {
      class_type: "VAEDecode",
      inputs: { samples: ["5", 0], vae: ["10", 2] },
    },
    "9": {
      class_type: "SaveImage",
      inputs: { filename_prefix: "hidream_o1", images: ["8", 0] },
    },
  };
}

function buildFluxSchnellWorkflow(params: GenerateParams): Record<string, unknown> {
  const seed = params.seed ?? randomInt(1, 281474976710655);
  return {
    "10": {
      class_type: "UNETLoader",
      inputs: { unet_name: "flux1-schnell-fp8-e4m3fn.safetensors", weight_dtype: "fp8_e4m3fn" },
    },
    "11": {
      class_type: "DualCLIPLoader",
      inputs: {
        clip_name1: "t5xxl_fp8_e4m3fn.safetensors",
        clip_name2: "clip_l.safetensors",
        type: "flux",
      },
    },
    "12": {
      class_type: "VAELoader",
      inputs: { vae_name: "flux-vae-bf16.safetensors" },
    },
    "6": {
      class_type: "CLIPTextEncode",
      inputs: { text: params.prompt, clip: ["11", 0] },
    },
    "7": {
      class_type: "CLIPTextEncode",
      inputs: { text: "", clip: ["11", 0] },
    },
    "5": {
      class_type: "KSampler",
      inputs: {
        seed,
        steps: 4,
        cfg: 1.0,
        sampler_name: "euler",
        scheduler: "simple",
        denoise: 1.0,
        model: ["10", 0],
        positive: ["6", 0],
        negative: ["7", 0],
        latent_image: ["13", 0],
      },
    },
    "13": {
      class_type: "EmptyLatentImage",
      inputs: { width: params.width, height: params.height, batch_size: 1 },
    },
    "8": {
      class_type: "VAEDecode",
      inputs: { samples: ["5", 0], vae: ["12", 0] },
    },
    "9": {
      class_type: "SaveImage",
      inputs: { filename_prefix: "flux_schnell", images: ["8", 0] },
    },
  };
}

function buildQwenImageWorkflow(params: GenerateParams): Record<string, unknown> {
  const seed = params.seed ?? randomInt(1, 281474976710655);
  return {
    "10": {
      class_type: "CheckpointLoaderSimple",
      inputs: { ckpt_name: "qwen_image_2512.safetensors" },
    },
    "11": {
      class_type: "VAELoader",
      inputs: { vae_name: "flux-vae-bf16.safetensors" },
    },
    "6": {
      class_type: "CLIPTextEncode",
      inputs: { text: params.prompt, clip: ["10", 1] },
    },
    "7": {
      class_type: "CLIPTextEncode",
      inputs: { text: "", clip: ["10", 1] },
    },
    "3": {
      class_type: "KSampler",
      inputs: {
        seed,
        steps: 20,
        cfg: 4.0,
        sampler_name: "euler",
        scheduler: "normal",
        denoise: 1.0,
        model: ["10", 0],
        positive: ["6", 0],
        negative: ["7", 0],
        latent_image: ["5", 0],
      },
    },
    "5": {
      class_type: "EmptyLatentImage",
      inputs: { width: params.width, height: params.height, batch_size: 1 },
    },
    "8": {
      class_type: "VAEDecode",
      inputs: { samples: ["3", 0], vae: ["11", 0] },
    },
    "9": {
      class_type: "SaveImage",
      inputs: { filename_prefix: "qwen_image", images: ["8", 0] },
    },
  };
}

export function buildEnhanceOnlyWorkflow(params: {
  prompt: string;
  width: number;
  height: number;
}): Record<string, unknown> {
  const pePrompt = buildPePrompt(params);
  return {
    "98": {
      class_type: "CLIPLoader",
      inputs: {
        clip_name: "ernie-image-prompt-enhancer.safetensors",
        type: "flux2",
        device: "default",
      },
    },
    "95": {
      class_type: "TextGenerate",
      inputs: {
        clip: ["98", 0],
        prompt: pePrompt,
        max_length: 2048,
        sampling_mode: "on",
        "sampling_mode.temperature": 0.6,
        "sampling_mode.top_k": 64,
        "sampling_mode.top_p": 0.8,
        "sampling_mode.min_p": 0.05,
        "sampling_mode.repetition_penalty": 1.05,
        "sampling_mode.seed": randomInt(1, 281474976710655),
      },
    },
    "103": {
      class_type: "PreviewAny",
      inputs: { source: ["95", 0] },
    },
  };
}
