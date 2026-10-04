---
uid: a0a250da
id: bili.upload.part
parent: bili.upload
state: planned
tags: [planned, "worker:W-CONTENT", leaf]
name: {zh: "分P与媒体绑定", en: "Parts and media binding"}
description:
  zh: >
      多分 P 顺序、标题、时长、封面与原件绑定
  en: >
      Multi-part ordering, titles, duration, covers and source binding
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/upload/part/src/part.ts"
  - path: "services/upload/part/tests/part.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/upload/parts"
    description:
      zh: >
          新增分P
      en: >
          Add a part
    input: {module: "bili.upload.part", name: "VideoPartRequest"}
    output: {module: "bili.upload.part", name: "VideoPart"}
  - protocol: http
    method: PUT
    path: "/api/v1/upload/parts/"
    description:
      zh: >
          调整分P顺序
      en: >
          Reorder parts
    input: {module: "bili.upload.part", name: "VideoPartRequest"}
    output: {module: "bili.upload.part", name: "VideoPart"}
types:
  - name: "VideoPart"
    description: {zh: "分P", en: "Video part"}
    schema: {"type":"object","description":"分P / Video part","additionalProperties":false,"properties":{"partId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 partId（语义见对应领域契约） / Field partId"},"draftId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 draftId（语义见对应领域契约） / Field draftId"},"index":{"type":"integer","description":"字段 index（语义见对应领域契约） / Field index"},"title":{"type":"string","minLength":1,"description":"标题 / Title"},"durationMs":{"type":"integer","description":"时长（毫秒） / Duration in ms"},"assetId":{"$ref":"urn:normify:bili.contract.common:Id","description":"媒体资源 ID / Media asset id"}},"required":["partId","draftId","index","title","durationMs","assetId"]}
  - name: "VideoPartRequest"
    description: {zh: "分P写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定）", en: "Video part write request carrying only client-provided fields"}
    schema: {"type":"object","description":"分P写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定） / Video part write request carrying only client-provided fields","additionalProperties":false,"properties":{"partId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 partId（语义见对应领域契约） / Field partId"},"draftId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 draftId（语义见对应领域契约） / Field draftId"},"index":{"type":"integer","description":"字段 index（语义见对应领域契约） / Field index"},"title":{"type":"string","minLength":1,"description":"标题 / Title"},"durationMs":{"type":"integer","description":"时长（毫秒） / Duration in ms"},"assetId":{"$ref":"urn:normify:bili.contract.common:Id","description":"媒体资源 ID / Media asset id"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["partId","draftId","index","title","durationMs","assetId","idempotencyKey","requestContext"]}
deps:
  - kind: call
    to: bili.media.asset
    label: {zh: "读取原件元数据与处理状态", en: "Read source metadata and"}
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
