---
uid: 37fc3054
id: data.contract.t-cde8718d
parent: data.contract
state: planned
tags: ["worker:contract-adapters", "projection:data-contract"]
name: {zh: "OutboxRecord", en: "OutboxRecord"}
description:
  zh: >
      事务发件箱记录
  en: >
      Outbox record
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/contract/t-cde8718d.json"
apis: []
types:
  - name: "OutboxRecord"
    description: {zh: "事务发件箱记录", en: "Outbox record"}
    schema: {"type":"object","additionalProperties":false,"description":"与业务写同事务落库，派发器轮询","properties":{"outboxId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"eventType":{"type":"string","description":"事件类型"},"eventVersion":{"type":"integer","description":"事件版本","minimum":1},"aggregateId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"aggregateVersion":{"type":"integer","description":"聚合版本","minimum":1},"payloadJson":{"type":"string","description":"事件载荷 JSON"},"status":{"type":"string","enum":["pending","published","failed","dead"],"description":"状态"},"attempts":{"type":"integer","description":"已尝试次数","minimum":0},"nextAttemptAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"},"createdAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"}},"required":["outboxId","eventType","eventVersion","aggregateId","status","createdAt"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-7a625dbd
    label: {zh: "类型引用", en: "Type reference"}
---
