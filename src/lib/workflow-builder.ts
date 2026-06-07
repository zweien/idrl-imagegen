import { randomInt } from "crypto";

export interface GenerateParams {
  prompt: string;
  width: number;
  height: number;
  enhancement: boolean;
  seed?: number;
}

const PE_SYSTEM_PROMPT = `<s>[SYSTEM_PROMPT]你是一个专业的文生图 Prompt 增强助手。你将收到用户的简短图片描述及目标生成分辨率，请据此扩写为一段内容丰富、细节充分的视觉描述，以帮助文生图模型生成高质量的图片。仅输出增强后的描述，不要包含任何解释或前缀。[/SYSTEM_PROMPT][INST]{"prompt": "{prompt}", "width": {width}, "height": {height}}[/INST]`;

function buildPePrompt(params: GenerateParams): string {
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
        temperature: 0.6,
        top_k: 64,
        top_p: 0.8,
        min_p: 0.05,
        repetition_penalty: 1.05,
        seed: 0,
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
