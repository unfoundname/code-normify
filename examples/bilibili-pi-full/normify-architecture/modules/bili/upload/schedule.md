---
uid: fc7f5a42
id: bili.upload.schedule
parent: bili.upload
state: planned
tags: [planned, "worker:W-CONTENT", leaf]
name: {zh: "预约与定时发布", en: "Scheduled publishing"}
description:
  zh: >
      预约时间、发布队列、取消与失败重试
  en: >
      Schedule time, publishing queue, cancellation and retry
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/upload/schedule/src/schedule.ts"
  - path: "services/upload/schedule/tests/schedule.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/upload/schedules"
    description:
      zh: >
          创建预约发布
      en: >
          Create a scheduled publish
    input: {module: "bili.upload.schedule", name: "PublishRequest"}
    output: {module: "bili.upload.schedule", name: "PublishSchedule"}
  - protocol: http
    method: DELETE
    path: "/api/v1/upload/schedules/"
    description:
      zh: >
          取消预约
      en: >
          Cancel the schedule
    input: {module: "bili.upload.schedule", name: "CancelScheduleRequest"}
types:
  - name: "PublishSchedule"
    description: {zh: "发布排期", en: "Publish schedule"}
    schema: {"type":"object","description":"发布排期 / Publish schedule","additionalProperties":false,"properties":{"scheduleId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 scheduleId（语义见对应领域契约） / Field scheduleId"},"draftId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 draftId（语义见对应领域契约） / Field draftId"},"scheduledAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"字段 scheduledAt（语义见对应领域契约） / Field scheduledAt"},"timezone":{"type":"string","minLength":1,"description":"字段 timezone（语义见对应领域契约） / Field timezone"},"status":{"type":"string","enum":["PENDING","FIRED","CANCELLED","FAILED"],"description":"状态 / Status"}},"required":["scheduleId","draftId","scheduledAt","timezone","status"]}
  - name: "CancelScheduleRequest"
    description: {zh: "取消排期请求", en: "Cancel schedule request"}
    schema: {"type":"object","description":"取消排期请求 / Cancel schedule request","additionalProperties":false,"properties":{"scheduleId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 scheduleId（语义见对应领域契约） / Field scheduleId"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["scheduleId","idempotencyKey","requestContext"]}
  - name: "PublishRequest"
    description: {zh: "发布排期写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定）", en: "Publish schedule write request carrying only client-provided fields"}
    schema: {"type":"object","description":"发布排期写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定） / Publish schedule write request carrying only client-provided fields","additionalProperties":false,"properties":{"scheduleId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 scheduleId（语义见对应领域契约） / Field scheduleId"},"draftId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 draftId（语义见对应领域契约） / Field draftId"},"scheduledAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"字段 scheduledAt（语义见对应领域契约） / Field scheduledAt"},"timezone":{"type":"string","minLength":1,"description":"字段 timezone（语义见对应领域契约） / Field timezone"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["scheduleId","draftId","scheduledAt","timezone","idempotencyKey","requestContext"]}
deps:
  - kind: event
    to: bili.catalog.event
    label: {zh: "到期触发唯一发布命令", en: "Fire the sole publish command"}
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
