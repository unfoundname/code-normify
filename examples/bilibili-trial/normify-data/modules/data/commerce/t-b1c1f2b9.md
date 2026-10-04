---
uid: a479223b
id: data.commerce.t-b1c1f2b9
parent: data.commerce
state: planned
tags: ["worker:cm-charge", "projection:data-contract"]
name: {zh: "ChargeRecord", en: "ChargeRecord"}
description:
  zh: >
      充电记录
  en: >
      Charge record
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/commerce/t-b1c1f2b9.json"
apis: []
types:
  - name: "ChargeRecord"
    description: {zh: "充电记录", en: "Charge record"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 charge_record；资金流向由账本分录保证","properties":{"chargeId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"userId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"ownerId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"amount":{"$ref":"urn:normify:data.contract.t-d2d2c734:MoneyAmount"},"message":{"type":"string","description":"留言","maxLength":200},"anonymous":{"type":"boolean","description":"是否匿名"},"orderId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"ledgerTransferId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"createdAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"}},"required":["chargeId","userId","ownerId","amount","orderId","createdAt"]}
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
