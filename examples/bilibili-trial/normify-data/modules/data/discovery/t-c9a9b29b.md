---
uid: 219c022d
id: data.discovery.t-c9a9b29b
parent: data.discovery
state: planned
tags: ["worker:disc-behavior", "projection:data-contract"]
name: {zh: "BehaviorEvent", en: "BehaviorEvent"}
description:
  zh: >
      行为事件
  en: >
      Behavior event
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/discovery/t-c9a9b29b.json"
apis: []
types:
  - name: "BehaviorEvent"
    description: {zh: "行为事件", en: "Behavior event"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 behavior_event（只追加），按 occurred_at 分区；不写入敏感个人标识","properties":{"eventId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"userId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"anonymousId":{"type":"string","description":"匿名标识（未登录）"},"targetType":{"type":"string","description":"目标类型"},"targetId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"action":{"type":"string","enum":["expose","click","play","pause","finish","like","coin","favorite","share","search","follow","not_interested"],"description":"行为"},"positionMs":{"type":"integer","description":"播放位置毫秒","minimum":0},"dwellMs":{"type":"integer","description":"停留毫秒","minimum":0},"sessionId":{"type":"string","description":"会话 id"},"deviceType":{"type":"string","enum":["web","ios","android","tv","unknown"],"description":"设备"},"occurredAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"},"idempotencyKey":{"$ref":"urn:normify:data.contract.t-8cc5302d:IdempotencyKey"}},"required":["eventId","action","targetType","occurredAt"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-7a625dbd
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-8cc5302d
    label: {zh: "类型引用", en: "Type reference"}
---
