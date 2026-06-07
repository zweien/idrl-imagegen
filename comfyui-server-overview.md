## 39 服务器 ComfyUI 总结

### 基础环境

| 项目         | 详情                                                    |
| ------------ | ------------------------------------------------------- |
| 安装路径     | `/mnt/comfyui/ComfyUI`                                  |
| 安装方式     | Git clone + Python venv（非 Docker）                    |
| ComfyUI 版本 | 0.24.0                                                  |
| Python       | 3.12.3                                                  |
| PyTorch      | 2.6.0+cu124                                             |
| 启动命令     | `venv/bin/python3 main.py --listen 0.0.0.0 --port 8189` |
| GPU          | NVIDIA RTX 4090 (48GB VRAM)                             |
| 系统内存     | 629 GB                                                  |
| 磁盘         | 7TB NVMe，已用约 500GB                                  |

### 模型清单

| 模型                   | 文件位置                             | 大小         | 说明                                                                |
| ---------------------- | ------------------------------------ | ------------ | ------------------------------------------------------------------- |
| **FLUX.1-schnell**     | `checkpoints/`                       | 12GB         | fp8 量化，快速出图                                                  |
| **HiDream-O1-Dev**     | `checkpoints/`                       | 7.6GB + 17GB | fp8 缩放 / bf16 两个版本                                            |
| **ERNIE-Image**        | `checkpoints/` + `diffusion_models/` | 15GB × 2     | base + turbo                                                        |
| **Qwen-Image-2512**    | `checkpoints/`                       | 54GB         | 统一检查点（含 transformer + text encoder），VAE 使用 FLUX VAE 替代 |
| **Ideogram 4**         | `diffusion_models/`                  | 5.2GB × 2    | NVFP4 量化，有安全过滤器                                            |
| **Gemma 4**            | `text_encoders/`                     | 8.5GB        | 通用文本编码器                                                      |
| **Qwen-Image-2512 TE** | `text_encoders/`                     | 16GB         | 原始 text encoder                                                   |
| **T5-XXL**             | `text_encoders/`                     | 4.6GB        | FLUX 等模型使用                                                     |
| **FLUX VAE**           | `vae/`                               | 160MB        | bf16                                                                |
| **FLUX2 VAE**          | `vae/`                               | 321MB        | ERNIE-Image 使用                                                    |

### 核心 API 端点

```
POST http://192.168.1.39:8189/prompt     # 提交生成任务
GET  http://192.168.1.39:8189/history/{id}  # 查询任务状态/结果
GET  http://192.168.1.39:8189/queue       # 队列状态
GET  http://192.168.1.39:8189/object_info  # 节点信息（766个可用节点）
GET  http://192.168.1.39:8189/view?filename=xxx&type=output  # 获取生成的图片
GET  http://192.168.1.39:8189/system_stats  # 系统状态
```

### 关键加载节点

| 节点                     | 用途                         | 可用模型数 |
| ------------------------ | ---------------------------- | ---------- |
| `CheckpointLoaderSimple` | 一体化加载（model+clip+vae） | 6          |
| `UNETLoader`             | 单独加载 diffusion model     | 6          |
| `CLIPLoader`             | 单独加载 text encoder        | 7          |
| `DualCLIPLoader`         | 双文本编码器                 | -          |
| `VAELoader`              | 单独加载 VAE                 | 4          |
| `KSampler`               | 采样器（核心生图节点）       | -          |

### 已验证可用的模型-工作流对应

| 模型            | 加载方式                                                              | 状态           |
| --------------- | --------------------------------------------------------------------- | -------------- |
| FLUX.1-schnell  | `CheckpointLoaderSimple` 或 `UNETLoader`+`DualCLIPLoader`+`VAELoader` | 已验证         |
| HiDream-O1-Dev  | `CheckpointLoaderSimple`                                              | 已验证         |
| ERNIE-Image     | `UNETLoader` + `CLIPLoader` + `VAELoader`                             | 待验证         |
| Qwen-Image-2512 | `CheckpointLoaderSimple` + `VAELoader`(FLUX VAE)                      | 已验证         |
| Ideogram 4      | `UNETLoader` + `CLIPLoader` + `VAELoader`                             | 安全过滤器问题 |

### 构建生图 SaaS 的要点

1. **API 调用模式**：`POST /prompt` 提交工作流 JSON → 轮询 `GET /history/{id}` → `GET /view` 取图片
2. **并发限制**：RTX 4090 48GB VRAM，同时只能跑一个大模型；需队列管理
3. **模型切换**：不同模型工作流 JSON 结构不同（加载节点、参数各异），SaaS 层需要预置各模型的模板
4. **磁盘空间**：`diffusion_models/` 和 `checkpoints/` 有重复文件（ernie-image、turbo），可清理节省约 30GB