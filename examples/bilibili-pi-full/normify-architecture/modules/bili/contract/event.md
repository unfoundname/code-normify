---
uid: 0e0dee54
id: bili.contract.event
parent: bili.contract
state: planned
tags: [planned, "worker:W-CONTRACT", leaf]
name: {zh: "事件封套与去重", en: "Event envelope and dedupe"}
description:
  zh: >
      异步事件版本、生产/消费模块、去重键与失败处理策略
  en: >
      Async event version, producer/consumer modules, dedupe key and failure policy
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "contracts/types/event.ts"
  - path: "contracts/tests/event.test.mjs"
apis:
  - protocol: file
    path: "contracts/types/event.ts"
    description:
      zh: >
          事件契约入口
      en: >
          Event contract entry
types:
  - name: "EventEnvelope"
    description: {zh: "事件封套", en: "Event envelope"}
    schema: {"type":"object","description":"事件封套 / Event envelope","additionalProperties":false,"properties":{"eventId":{"$ref":"urn:normify:bili.contract.common:Id","description":"事件 ID / Event id"},"eventType":{"type":"string","minLength":1,"description":"事件类型 / Event type"},"eventVersion":{"type":"integer","description":"事件版本号 / Event version"},"producer":{"$ref":"urn:normify:bili.contract.common:ModuleId","description":"生产模块 id / Producer module id"},"consumers":{"type":"array","items":{"$ref":"urn:normify:bili.contract.common:ModuleId"},"description":"消费模块列表 / Consumer modules"},"occurredAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"发生时间 / Occurred at"},"dedupeKey":{"type":"string","minLength":1,"description":"去重键 / Dedupe key"},"payload":{"$ref":"urn:normify:bili.contract.event:EventPayload","description":"事件载荷 / Event payload"}},"required":["eventId","eventType","eventVersion","producer","consumers","occurredAt","dedupeKey","payload"]}
  - name: "EventPayload"
    description: {zh: "事件载荷", en: "Event payload"}
    schema: {"type":"object","description":"事件载荷 / Event payload","additionalProperties":false,"properties":{"payloadType":{"type":"string","minLength":1,"description":"字段 payloadType（语义见对应领域契约） / Field payloadType"},"resourceId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 resourceId（语义见对应领域契约） / Field resourceId"},"resourceType":{"type":"string","minLength":1,"description":"字段 resourceType（语义见对应领域契约） / Field resourceType"},"data":{"type":"object","additionalProperties":true,"description":"字段 data（语义见对应领域契约） / Field data"}},"required":["payloadType","resourceId","resourceType","data"]}
  - name: "EventAttributes"
    description: {zh: "事件属性集合", en: "Event attribute bag"}
    schema: {"type":"object","description":"事件属性集合 / Event attribute bag","additionalProperties":false,"properties":{"changedFields":{"type":"array","items":{"$ref":"urn:normify:bili.contract.common:Id"},"description":"字段 changedFields（语义见对应领域契约） / Field changedFields"},"reason":{"type":"string","minLength":1,"description":"原因或理由 / Reason"}},"required":["changedFields"]}
  - name: "OutboxMessage"
    description: {zh: "出箱消息", en: "Outbox message"}
    schema: {"type":"object","description":"出箱消息 / Outbox message","additionalProperties":false,"properties":{"messageId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 messageId（语义见对应领域契约） / Field messageId"},"topic":{"type":"string","minLength":1,"description":"字段 topic（语义见对应领域契约） / Field topic"},"attempt":{"type":"integer","description":"已重试次数 / Attempt count"},"attemptLimit":{"type":"integer","description":"最大重试次数 / Attempt limit"},"leaseUntil":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"租约到期时间 / Lease expiry"},"jobState":{"type":"string","enum":["PENDING","LEASED","PUBLISHED","FAILED"],"description":"任务状态 / Job state"}},"required":["messageId","topic","attempt","attemptLimit","jobState"]}
---
