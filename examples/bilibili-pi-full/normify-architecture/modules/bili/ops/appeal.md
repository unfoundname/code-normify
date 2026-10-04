---
uid: b4a87675
id: bili.ops.appeal
parent: bili.ops
state: planned
tags: [planned, "worker:W-OPS", leaf]
name: {zh: "申诉", en: "Appeals"}
description:
  zh: >
      申诉提交、复核、结果通知与撤销处罚
  en: >
      Appeal submission, review, notification and penalty revocation
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/ops/appeal/src/appeal.ts"
  - path: "services/ops/appeal/tests/appeal.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/ops/appeals"
    description:
      zh: >
          提交申诉
      en: >
          Submit an appeal
    input: {module: "bili.ops.appeal", name: "AppealRequest"}
    output: {module: "bili.ops.appeal", name: "AppealCase"}
  - protocol: http
    method: POST
    path: "/api/v1/ops/appeals/review"
    description:
      zh: >
          复核申诉
      en: >
          Review an appeal
    input: {module: "bili.ops.appeal", name: "AppealReviewRequest"}
    output: {module: "bili.ops.appeal", name: "AppealCase"}
types:
  - name: "AppealCase"
    description: {zh: "申诉案件", en: "Appeal case"}
    schema: {"type":"object","description":"申诉案件 / Appeal case","additionalProperties":false,"properties":{"appealId":{"$ref":"urn:normify:bili.contract.common:Id","description":"申诉 ID / Appeal id"},"userId":{"$ref":"urn:normify:bili.contract.common:Id","description":"用户 ID / User id"},"penaltyId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 penaltyId（语义见对应领域契约） / Field penaltyId"},"reason":{"type":"string","minLength":1,"description":"原因或理由 / Reason"},"status":{"type":"string","enum":["SUBMITTED","REVIEWING","ACCEPTED","REJECTED"],"description":"状态 / Status"},"reviewerId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 reviewerId（语义见对应领域契约） / Field reviewerId"},"createdAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"创建时间 / Created time"}},"required":["appealId","userId","penaltyId","reason","status","createdAt"]}
  - name: "AppealReviewRequest"
    description: {zh: "申诉复核请求", en: "Appeal review request"}
    schema: {"type":"object","description":"申诉复核请求 / Appeal review request","additionalProperties":false,"properties":{"appealId":{"$ref":"urn:normify:bili.contract.common:Id","description":"申诉 ID / Appeal id"},"decision":{"type":"string","enum":["ACCEPT","REJECT"],"description":"字段 decision（语义见对应领域契约） / Field decision"},"reviewerNote":{"type":"string","minLength":1,"description":"字段 reviewerNote（语义见对应领域契约） / Field reviewerNote"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["appealId","decision","idempotencyKey","requestContext"]}
  - name: "AppealRequest"
    description: {zh: "申诉案件写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定）", en: "Appeal case write request carrying only client-provided fields"}
    schema: {"type":"object","description":"申诉案件写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定） / Appeal case write request carrying only client-provided fields","additionalProperties":false,"properties":{"appealId":{"$ref":"urn:normify:bili.contract.common:Id","description":"申诉 ID / Appeal id"},"penaltyId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 penaltyId（语义见对应领域契约） / Field penaltyId"},"reason":{"type":"string","minLength":1,"description":"原因或理由 / Reason"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["appealId","penaltyId","reason","idempotencyKey","requestContext"]}
deps:
  - kind: call
    to: bili.message.system
    label: {zh: "申诉结果通知", en: "Appeal result notification"}
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
