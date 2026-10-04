---
uid: 1cf5f34b
id: bili.media.cover
parent: bili.media
state: planned
tags: [planned, "worker:W-MEDIA", leaf]
name: {zh: "封面与截图", en: "Covers and thumbnails"}
description:
  zh: >
      抽帧截图、裁剪规格、封面候选与人工选择
  en: >
      Frame extraction, crop presets, cover candidates and manual selection
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/media/cover/src/cover.ts"
  - path: "services/media/cover/tests/cover.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/media/cover-candidates"
    description:
      zh: >
          生成封面候选
      en: >
          Generate cover candidates
    input: {module: "bili.media.cover", name: "CoverCandidateRequest"}
    output: {module: "bili.contract.common", name: "PageResult"}
  - protocol: http
    method: PUT
    path: "/api/v1/media/covers"
    description:
      zh: >
          选定封面
      en: >
          Select a cover
    input: {module: "bili.media.cover", name: "CoverCandidateRequest"}
types:
  - name: "CoverCandidate"
    description: {zh: "封面候选", en: "Cover candidate"}
    schema: {"type":"object","description":"封面候选 / Cover candidate","additionalProperties":false,"properties":{"candidateId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 candidateId（语义见对应领域契约） / Field candidateId"},"assetId":{"$ref":"urn:normify:bili.contract.common:Id","description":"媒体资源 ID / Media asset id"},"objectKey":{"type":"string","minLength":1,"description":"OSS 对象键 / OSS object key"},"positionMs":{"type":"integer","description":"时间点（毫秒） / Position in ms"},"width":{"type":"integer","description":"宽（像素） / Width in pixels"},"height":{"type":"integer","description":"高（像素） / Height in pixels"}},"required":["candidateId","assetId","objectKey","positionMs","width","height"]}
  - name: "CoverCandidateRequest"
    description: {zh: "封面候选生成请求", en: "Cover candidate request"}
    schema: {"type":"object","description":"封面候选生成请求 / Cover candidate request","additionalProperties":false,"properties":{"assetId":{"$ref":"urn:normify:bili.contract.common:Id","description":"媒体资源 ID / Media asset id"},"positionCount":{"type":"integer","description":"字段 positionCount（语义见对应领域契约） / Field positionCount"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["assetId","positionCount","idempotencyKey","requestContext"]}
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
