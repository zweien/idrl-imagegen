import { describe, it, expect } from "vitest";
import { buildWorkflow, GenerateParams } from "../src/lib/workflow-builder";

describe("buildWorkflow", () => {
  const baseParams: GenerateParams = {
    prompt: "a cute cat",
    width: 1024,
    height: 1024,
    enhancement: false,
  };

  it("should produce base nodes without enhancement", () => {
    const wf = buildWorkflow(baseParams);
    expect(wf["66"]).toBeDefined(); // UNETLoader
    expect(wf["62"]).toBeDefined(); // CLIPLoader
    expect(wf["63"]).toBeDefined(); // VAELoader
    expect(wf["71"]).toBeDefined(); // EmptyFlux2LatentImage
    expect(wf["67"]).toBeDefined(); // CLIPTextEncode
    expect(wf["91"]).toBeDefined(); // ConditioningZeroOut
    expect(wf["70"]).toBeDefined(); // KSampler
    expect(wf["65"]).toBeDefined(); // VAEDecode
    expect(wf["73"]).toBeDefined(); // SaveImage
    expect(wf["98"]).toBeUndefined(); // CLIPLoader PE
    expect(wf["95"]).toBeUndefined(); // TextGenerate
  });

  it("should pass prompt directly to CLIPTextEncode without enhancement", () => {
    const wf = buildWorkflow(baseParams);
    expect(wf["67"].inputs.text).toBe("a cute cat");
  });

  it("should include PE nodes with enhancement enabled", () => {
    const params = { ...baseParams, enhancement: true };
    const wf = buildWorkflow(params);
    expect(wf["98"]).toBeDefined();
    expect(wf["95"]).toBeDefined();
    expect(wf["67"].inputs.text).toEqual(["95", 0]);
  });

  it("should set width and height in EmptyFlux2LatentImage", () => {
    const wf = buildWorkflow({ ...baseParams, width: 1920, height: 1080 });
    expect(wf["71"].inputs.width).toBe(1920);
    expect(wf["71"].inputs.height).toBe(1080);
  });

  it("should set custom seed in KSampler", () => {
    const wf = buildWorkflow({ ...baseParams, seed: 42 });
    expect(wf["70"].inputs.seed).toBe(42);
  });

  it("should generate random seed when not provided", () => {
    const wf1 = buildWorkflow(baseParams);
    const wf2 = buildWorkflow(baseParams);
    expect(wf1["70"].inputs.seed).toBeTypeOf("number");
    expect(wf2["70"].inputs.seed).toBeTypeOf("number");
  });

  it("should set correct KSampler parameters", () => {
    const wf = buildWorkflow(baseParams);
    const ks = wf["70"].inputs;
    expect(ks.steps).toBe(8);
    expect(ks.cfg).toBe(1);
    expect(ks.sampler_name).toBe("euler");
    expect(ks.scheduler).toBe("simple");
    expect(ks.denoise).toBe(1);
  });

  it("should wire node links correctly", () => {
    const wf = buildWorkflow(baseParams);
    expect(wf["70"].inputs.model).toEqual(["66", 0]);
    expect(wf["70"].inputs.positive).toEqual(["67", 0]);
    expect(wf["70"].inputs.negative).toEqual(["91", 0]);
    expect(wf["70"].inputs.latent_image).toEqual(["71", 0]);
    expect(wf["65"].inputs.samples).toEqual(["70", 0]);
    expect(wf["65"].inputs.vae).toEqual(["63", 0]);
    expect(wf["73"].inputs.images).toEqual(["65", 0]);
    expect(wf["91"].inputs.conditioning).toEqual(["67", 0]);
    expect(wf["67"].inputs.clip).toEqual(["62", 0]);
  });

  it("should build PE prompt with prompt/width/height replaced", () => {
    const params = { ...baseParams, enhancement: true, width: 800, height: 600 };
    const wf = buildWorkflow(params);
    const pePrompt = wf["95"].inputs.prompt as string;
    expect(pePrompt).toContain('"prompt": "a cute cat"');
    expect(pePrompt).toContain('"width": 800');
    expect(pePrompt).toContain('"height": 600');
    expect(pePrompt).toContain("SYSTEM_PROMPT");
  });
});
