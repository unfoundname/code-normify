---
uid: a430653a
id: bili.media.subtitle
parent: bili.media
state: planned
tags: [planned, "worker:W-MEDIA", leaf]
name: {zh: "字幕处理", en: "Subtitle processing"}
description:
  zh: >
      外挂/内嵌字幕识别、格式转换、时间轴与自动字幕
  en: >
      Embedded and side-car subtitle detection, conversion, timeline and ASR subtitles
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/media/subtitle/src/subtitle.ts"
  - path: "services/media/subtitle/tests/subtitle.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/media/subtitles"
    description:
      zh: >
          上传字幕
      en: >
          Upload a subtitle
    input: {module: "bili.media.subtitle", name: "SubtitleUploadRequest"}
    output: {module: "bili.media.asset", name: "SubtitleTrack"}
  - protocol: http
    method: POST
    path: "/api/v1/media/subtitles/auto"
    description:
      zh: >
          生成自动字幕任务
      en: >
          Start an ASR subtitle job
    input: {module: "bili.media.subtitle", name: "AutoSubtitleRequest"}
    output: {module: "bili.media.asset", name: "SubtitleTrack"}
types:
  - name: "SubtitleUploadRequest"
    description: {zh: "字幕上传请求", en: "Subtitle upload request"}
    schema: {"type":"object","description":"字幕上传请求 / Subtitle upload request","additionalProperties":false,"properties":{"assetId":{"$ref":"urn:normify:bili.contract.common:Id","description":"媒体资源 ID / Media asset id"},"language":{"type":"string","minLength":1,"description":"语言代码 / Language code"},"format":{"type":"string","enum":["ASS","SRT","VTT"],"description":"格式 / Format"},"contentUrl":{"type":"string","minLength":1,"format":"uri","description":"字段 contentUrl（语义见对应领域契约） / Field contentUrl"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["assetId","language","format","contentUrl","idempotencyKey","requestContext"]}
  - name: "AutoSubtitleRequest"
    description: {zh: "自动字幕请求", en: "Auto subtitle request"}
    schema: {"type":"object","description":"自动字幕请求 / Auto subtitle request","additionalProperties":false,"properties":{"assetId":{"$ref":"urn:normify:bili.contract.common:Id","description":"媒体资源 ID / Media asset id"},"language":{"type":"string","minLength":1,"description":"语言代码 / Language code"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["assetId","language","idempotencyKey","requestContext"]}
deps:
  - kind: call
    to: bili.infra.db
    label: {zh: "事务读写与表所有权校验", en: "Transactional persistence and"}
  - kind: event
    to: bili.infra.outbox
    label: {zh: "异步事件出箱与重试", en: "Async event outbox and retry"}
  - kind: reference
    to: bili.contract.common
    label: {zh: "统一 ID/时间/分页/错误契约", en: "Unified id, time, pagination"}
---
