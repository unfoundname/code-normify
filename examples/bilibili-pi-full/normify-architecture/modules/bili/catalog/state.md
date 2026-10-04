---
uid: ab777452
id: bili.catalog.state
parent: bili.catalog
state: planned
tags: [planned, "worker:W-CONTENT", leaf]
name: {zh: "发布状态机实现", en: "Publish state machine implementation"}
description:
  zh: >
      唯一允许修改发布状态的模块，其余模块只能请求迁移
  en: >
      The only module allowed to change publish state; others may only request transitions
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/catalog/state/src/publish-state.ts"
  - path: "services/catalog/state/tests/publish-state.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/catalog/publish-transitions"
    description:
      zh: >
          请求发布状态迁移
      en: >
          Request a publish transition
    input: {module: "bili.catalog.state", name: "PublishTransitionRequest"}
    output: {module: "bili.catalog.state", name: "PublishTransitionResult"}
types:
  - name: "PublishTransitionRequest"
    description: {zh: "发布状态迁移请求", en: "Publish transition request"}
    schema: {"type":"object","description":"发布状态迁移请求 / Publish transition request","additionalProperties":false,"properties":{"bvid":{"type":"string","minLength":1,"description":"视频业务号（BV 号） / Video business id"},"toState":{"type":"string","enum":["DRAFT","SCHEDULED","PUBLISHING","PUBLISHED","PRIVATE","REMOVED","DELETED"],"description":"字段 toState（语义见对应领域契约） / Field toState"},"reason":{"type":"string","enum":["PUBLISH","PRIVATE","PUBLIC","REMOVE","DELETE","SCHEDULE"],"description":"原因或理由 / Reason"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["bvid","toState","reason","idempotencyKey","requestContext"]}
  - name: "PublishTransitionResult"
    description: {zh: "发布迁移结果", en: "Publish transition result"}
    schema: {"type":"object","description":"发布迁移结果 / Publish transition result","additionalProperties":false,"properties":{"bvid":{"type":"string","minLength":1,"description":"视频业务号（BV 号） / Video business id"},"fromState":{"$ref":"urn:normify:bili.contract.state:PublishState","description":"字段 fromState（语义见对应领域契约） / Field fromState"},"toState":{"$ref":"urn:normify:bili.contract.state:PublishState","description":"字段 toState（语义见对应领域契约） / Field toState"},"changedAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"字段 changedAt（语义见对应领域契约） / Field changedAt"},"eventEnvelope":{"$ref":"urn:normify:bili.contract.event:EventEnvelope","description":"字段 eventEnvelope（语义见对应领域契约） / Field eventEnvelope"}},"required":["bvid","fromState","toState","changedAt"]}
deps:
  - kind: call
    to: bili.catalog.video
    label: {zh: "校验目录可见性前置条件", en: "Validate catalog preconditions"}
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
