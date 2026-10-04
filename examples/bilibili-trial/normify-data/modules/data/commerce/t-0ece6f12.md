---
uid: e48773e5
id: data.commerce.t-0ece6f12
parent: data.commerce
state: planned
tags: ["worker:cm-charge", "projection:data-contract"]
name: {zh: "ChargeSubscription", en: "ChargeSubscription"}
description:
  zh: >
      充电支持订阅
  en: >
      Charge subscription
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/commerce/t-0ece6f12.json"
apis: []
types:
  - name: "ChargeSubscription"
    description: {zh: "充电支持订阅", en: "Charge subscription"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 charge_subscription","properties":{"subscriptionId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"userId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"ownerId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"tierAmount":{"$ref":"urn:normify:data.contract.t-d2d2c734:MoneyAmount"},"state":{"type":"string","enum":["active","paused","cancelled","failed"],"description":"状态机"},"startAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"},"nextChargeAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"},"totalCharged":{"$ref":"urn:normify:data.contract.t-d2d2c734:MoneyAmount"},"failures":{"type":"integer","description":"扣款失败次数","minimum":0}},"required":["subscriptionId","userId","ownerId","tierAmount","state","nextChargeAt"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-d2d2c734
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-7a625dbd
    label: {zh: "类型引用", en: "Type reference"}
---
