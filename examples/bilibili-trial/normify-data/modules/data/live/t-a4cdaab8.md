---
uid: 90e3e19a
id: data.live.t-a4cdaab8
parent: data.live
state: planned
tags: ["worker:live-gift", "projection:data-contract"]
name: {zh: "GiftSendRequest", en: "GiftSendRequest"}
description:
  zh: >
      送礼请求
  en: >
      Gift send request
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/live/t-a4cdaab8.json"
apis: []
types:
  - name: "GiftSendRequest"
    description: {zh: "送礼请求", en: "Gift send request"}
    schema: {"type":"object","additionalProperties":false,"description":"扣款与入账必须同事务写账本分录","properties":{"roomId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"senderId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"giftId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"count":{"type":"integer","description":"数量","minimum":1,"maximum":9999},"comboId":{"type":"string","description":"连击批次 id"},"message":{"type":"string","description":"留言","maxLength":200},"anonymous":{"type":"boolean","description":"是否匿名"},"idempotencyKey":{"$ref":"urn:normify:data.contract.t-8cc5302d:IdempotencyKey"}},"required":["roomId","senderId","giftId","count","idempotencyKey"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-8cc5302d
    label: {zh: "类型引用", en: "Type reference"}
---
