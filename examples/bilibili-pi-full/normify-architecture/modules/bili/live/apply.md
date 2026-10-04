---
uid: c2b266ac
id: bili.live.apply
parent: bili.live
state: planned
tags: [planned, "worker:W-LIVE", leaf]
name: {zh: "主播准入", en: "Streamer onboarding"}
description:
  zh: >
      实名与资质校验、准入审核、签约与开播权限
  en: >
      Real-name and qualification checks, onboarding review, contracts and streaming permission
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/live/apply/src/apply.ts"
  - path: "services/live/apply/tests/apply.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/live/streamer-applications"
    description:
      zh: >
          提交主播准入申请
      en: >
          Submit a streamer application
    input: {module: "bili.live.apply", name: "StreamerApplyRequest"}
    output: {module: "bili.live.apply", name: "StreamerProfile"}
types:
  - name: "StreamerApplyRequest"
    description: {zh: "主播申请请求", en: "Streamer application"}
    schema: {"type":"object","description":"主播申请请求 / Streamer application","additionalProperties":false,"properties":{"userId":{"$ref":"urn:normify:bili.contract.common:Id","description":"用户 ID / User id"},"category":{"type":"string","enum":["GAME","KNOWLEDGE","ENTERTAINMENT","SPORTS","OTHER"],"description":"字段 category（语义见对应领域契约） / Field category"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["userId","category","idempotencyKey","requestContext"]}
  - name: "StreamerProfile"
    description: {zh: "主播档案", en: "Streamer profile"}
    schema: {"type":"object","description":"主播档案 / Streamer profile","additionalProperties":false,"properties":{"userId":{"$ref":"urn:normify:bili.contract.common:Id","description":"用户 ID / User id"},"status":{"type":"string","enum":["APPLYING","APPROVED","REJECTED","SUSPENDED"],"description":"状态 / Status"},"contractSigned":{"type":"boolean","description":"字段 contractSigned（语义见对应领域契约） / Field contractSigned"},"approvedAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"字段 approvedAt（语义见对应领域契约） / Field approvedAt"}},"required":["userId","status","contractSigned"]}
deps:
  - kind: call
    to: bili.identity.verify
    label: {zh: "实名与成年核验", en: "Real-name and adult"}
  - kind: call
    to: bili.ops.audit
    label: {zh: "准入审核", en: "Onboarding review"}
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
