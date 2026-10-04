---
uid: ff4ba804
id: data.ecosystem.t-aa3f03d6
parent: data.ecosystem
state: planned
tags: ["worker:eco-mall", "projection:data-contract"]
name: {zh: "MallOrderBridge", en: "MallOrderBridge"}
description:
  zh: >
      订单桥接
  en: >
      Order bridge
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/ecosystem/t-aa3f03d6.json"
apis: []
types:
  - name: "MallOrderBridge"
    description: {zh: "订单桥接", en: "Order bridge"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 mall_order_bridge；失败必须显式告警，不静默丢弃","properties":{"bridgeId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"orderId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"externalOrderNo":{"type":"string","description":"外部订单号"},"productId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"quantity":{"type":"integer","description":"数量","minimum":1},"state":{"type":"string","enum":["created","synced","shipped","completed","cancelled","sync_failed"],"description":"状态机"},"syncedAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"},"lastError":{"type":"string","description":"最后错误"},"retryCount":{"type":"integer","description":"重试次数","minimum":0}},"required":["bridgeId","orderId","externalOrderNo","productId","state"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-7a625dbd
    label: {zh: "类型引用", en: "Type reference"}
---
