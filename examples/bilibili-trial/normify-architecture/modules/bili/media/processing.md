---
uid: "67790706"
id: bili.media.processing
parent: bili.media
state: planned
tags: ["worker:med-processing"]
name: {zh: "探测、转码与档位", en: "Probe, Transcode and Renditions"}
description:
  zh: >
      探测编码参数、按档位转码、生成 HLS/DASH、音轨提取与预览雪碧图；任务租约与重试由基础设施承担。
      
  en: >
      Probe codecs, transcode per rendition, package HLS/DASH, extract audio, build preview storyboards.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/media/processing/src/pipeline.ts"
  - path: "services/media/processing/src/transcode.ts"
  - path: "services/media/processing/migrations/0001_processing.sql"
  - path: "services/media/processing/tests/pipeline.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/media/jobs"
    description:
      zh: >
          创建媒体处理任务
          
      en: >
          Create media job
          
    input: {module: "bili.media.processing", name: "TranscodeJobRequest"}
    output: {module: "bili.contract.media.job", name: "MediaJob"}
  - protocol: http
    method: GET
    path: "/api/v1/media/jobs/{id}"
    description:
      zh: >
          读取任务状态
          
      en: >
          Get job
          
    output: {module: "bili.contract.media.job", name: "MediaJob"}
  - protocol: http
    method: POST
    path: "/api/v1/media/jobs/{id}/retry"
    description:
      zh: >
          重试失败任务
          
      en: >
          Retry job
          
    input: {module: "bili.contract.core.idempotency", name: "IdempotencyKey"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: GET
    path: "/api/v1/media/videos/{videoId}/pipeline"
    description:
      zh: >
          读取处理流水线状态
          
      en: >
          Get pipeline state
          
    output: {module: "bili.media.processing", name: "MediaPipelineState"}
  - protocol: mysql
    path: "media_job"
    description:
      zh: >
          媒体任务表（唯一写入所有者：媒体处理服务）
          
      en: >
          media_job table
          
types:
  - name: "TranscodeJobRequest"
    description: {zh: "转码任务请求", en: "Transcode job request"}
    schema: {"type":"object","additionalProperties":false,"properties":{"videoId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"assetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"profiles":{"type":"array","description":"目标档位","items":{"$ref":"urn:normify:bili.contract.media.job:RenditionSpec"},"minItems":1},"priority":{"type":"integer","description":"优先级","minimum":0,"maximum":9},"generatePreview":{"type":"boolean","description":"是否生成预览图"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.core.idempotency:IdempotencyKey"}},"required":["videoId","assetId","profiles","idempotencyKey"]}
  - name: "RenditionOutput"
    description: {zh: "档位产物", en: "Rendition output"}
    schema: {"type":"object","additionalProperties":false,"description":"产物只存 OSS，RDS 只存引用","properties":{"renditionId":{"type":"string","description":"档位 id"},"quality":{"type":"string","description":"清晰度"},"ossKey":{"type":"string","description":"产物对象键"},"packageFormat":{"type":"string","enum":["hls","dash","mp4"],"description":"封装"},"sizeBytes":{"type":"integer","description":"字节数","minimum":0},"bitrateKbps":{"type":"integer","description":"实际码率","minimum":0},"durationMs":{"type":"integer","description":"时长毫秒","minimum":0},"checksumSha256":{"type":"string","description":"SHA-256"}},"required":["renditionId","quality","ossKey","packageFormat","sizeBytes"]}
  - name: "MediaPipelineState"
    description: {zh: "媒体处理流水线状态", en: "Media pipeline state"}
    schema: {"type":"object","additionalProperties":false,"description":"媒体状态机，与审核状态机、发布状态机相互独立","properties":{"videoId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"probeState":{"type":"string","enum":["pending","running","done","failed"],"description":"探测状态"},"transcodeState":{"type":"string","enum":["pending","running","done","failed","partial"],"description":"转码状态"},"subtitleState":{"type":"string","enum":["pending","running","done","failed","skipped"],"description":"字幕状态"},"artworkState":{"type":"string","enum":["pending","running","done","failed"],"description":"封面状态"},"overall":{"type":"string","enum":["processing","ready","partial_ready","failed"],"description":"总体"},"updatedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["videoId","overall","updatedAt"]}
deps:
  - kind: call
    to: bili.media.asset
    from_api: "POST /api/v1/media/jobs"
    label: {zh: "读取原件与登记产物", en: "Read original and register out"}
  - kind: call
    to: bili.contract.adapters.oss
    label: {zh: "读写 OSS 对象", en: "Read and write objects"}
  - kind: call
    to: bili.infra.jobs
    label: {zh: "任务租约与重试由派发器驱动", en: "Lease and retry via dispatcher"}
  - kind: event
    to: bili.contract.core.events
    label: {zh: "处理完成事件驱动后续环节", en: "Processing events"}
  - kind: dataflow
    to: bili.media.asset
    label: {zh: "产物登记回媒体资产", en: "Outputs registered as assets"}
---
