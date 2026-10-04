---
uid: d82bc2ee
id: data.commerce.t-5eff512c
parent: data.commerce
state: planned
tags: ["worker:cm-order", "projection:data-contract"]
name: {zh: "RefundRequest", en: "RefundRequest"}
description:
  zh: >
      退款申请
  en: >
      Refund request
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/commerce/t-5eff512c.json"
apis: []
types:
  - name: "RefundRequest"
    description: {zh: "退款申请", en: "Refund request"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 refund_request","properties":{"refundId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"orderId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"userId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"amount":{"$ref":"urn:normify:data.contract.t-d2d2c734:MoneyAmount"},"reason":{"type":"string","description":"原因","maxLength":300},"state":{"type":"string","enum":["requested","approved","rejected","processing","done","failed"],"description":"状态机"},"operatorId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"createdAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"},"decidedAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"},"channelRefundNo":{"type":"string","description":"渠道退款单号"}},"required":["refundId","orderId","userId","amount","state","createdAt"]}
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
