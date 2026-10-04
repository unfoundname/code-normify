---
uid: f619d019
id: bili.contract.core.events
parent: bili.contract.core
state: planned
tags: ["worker:contract-events"]
name: {zh: "事件契约", en: "Event Contract"}
description:
  zh: >
      异步事件统一信封：类型/版本/生产模块/聚合版本/去重键；消费订阅声明重试与死信策略；MQ 为显式迁移目标。
      
  en: >
      Event envelope with version, producer, aggregate version and dedupe key, plus consumer and dead-letter rules.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "packages/contracts/src/core/events.ts"
  - path: "packages/contracts/tests/events.test.ts"
apis: []
types:
  - name: "EventEnvelope"
    description: {zh: "事件信封", en: "Event envelope"}
    schema: {"type":"object","additionalProperties":false,"description":"RDS outbox 落库后由派发器发布","properties":{"eventId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"eventType":{"type":"string","description":"点分事件类型，如 publish.video.published","pattern":"^[a-z][a-z_]*\\.[a-z][a-z_]*\\.[a-z][a-z_]*$"},"eventVersion":{"type":"integer","description":"事件结构版本","minimum":1},"producer":{"type":"string","description":"生产模块 id"},"occurredAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"aggregateType":{"type":"string","enum":["video","media_asset","media_job","comment","danmaku","order","ledger","live_room","dynamic","user"],"description":"聚合类型"},"aggregateId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"aggregateVersion":{"type":"integer","description":"聚合版本，用于顺序与去重","minimum":1},"dedupeKey":{"type":"string","description":"消费端去重键"},"payload":{"type":"object","additionalProperties":true,"description":"事件载荷，结构由各域 payload schema 定义并按 eventVersion 演进"}},"required":["eventId","eventType","eventVersion","producer","occurredAt","aggregateId","aggregateVersion","dedupeKey"]}
  - name: "EventSubscription"
    description: {zh: "消费订阅声明", en: "Consumer subscription"}
    schema: {"type":"object","additionalProperties":false,"properties":{"consumerModule":{"type":"string","description":"消费模块 id"},"eventType":{"type":"string","description":"订阅的事件类型"},"dedupeWindowHours":{"type":"integer","description":"去重窗口（小时）","minimum":1},"maxRetries":{"type":"integer","description":"最大重试次数","minimum":0},"onFailure":{"type":"string","enum":["retry","dead_letter","manual_replay"],"description":"失败处理"},"ordered":{"type":"boolean","description":"是否要求按 aggregateVersion 顺序消费"}},"required":["consumerModule","eventType","maxRetries","onFailure"]}
  - name: "DeadLetterEvent"
    description: {zh: "死信事件", en: "Dead letter event"}
    schema: {"type":"object","additionalProperties":false,"properties":{"event":{"$ref":"urn:normify:bili.contract.core.events:EventEnvelope"},"failedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"attempts":{"type":"integer","description":"已尝试次数","minimum":1},"lastError":{"type":"string","description":"最后一次失败原因"}},"required":["event","failedAt","attempts","lastError"]}
---
