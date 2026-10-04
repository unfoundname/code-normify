---
uid: 747cb87a
id: data.ops.t-b56a1acc
parent: data.ops
state: planned
tags: ["worker:ops-audit", "projection:data-contract"]
name: {zh: "RiskAlert", en: "RiskAlert"}
description:
  zh: >
      风控告警
  en: >
      Risk alert
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/ops/t-b56a1acc.json"
apis: []
types:
  - name: "RiskAlert"
    description: {zh: "风控告警", en: "Risk alert"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 risk_alert，由行为与规则引擎产生","properties":{"alertId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"kind":{"type":"string","enum":["abnormal_login","credential_stuffing","content_farm","coin_laundering","gift_fraud","payment_chargeback","copyright_repeat","danmaku_spam"],"description":"类型"},"severity":{"type":"string","enum":["low","medium","high","critical"],"description":"级别"},"subjectType":{"type":"string","enum":["user","anchor","video","order","room","ip"],"description":"主体"},"subjectId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"signals":{"type":"array","description":"命中信号","items":{"type":"string","description":"信号码"}},"state":{"type":"string","enum":["open","investigating","confirmed","dismissed"],"description":"状态机"},"createdAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"},"handledBy":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"resolution":{"type":"string","description":"处置结论"}},"required":["alertId","kind","severity","subjectType","subjectId","state","createdAt"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-7a625dbd
    label: {zh: "类型引用", en: "Type reference"}
---
