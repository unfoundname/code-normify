---
uid: 77df8f12
id: data.client.t-9becdf4e
parent: data.client
state: planned
tags: ["worker:web-commerce", "projection:data-contract"]
name: {zh: "MembershipPageState", en: "MembershipPageState"}
description:
  zh: >
      会员页状态
  en: >
      Membership page state
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/client/t-9becdf4e.json"
apis: []
types:
  - name: "MembershipPageState"
    description: {zh: "会员页状态", en: "Membership page state"}
    schema: {"type":"object","additionalProperties":false,"properties":{"plans":{"type":"array","description":"套餐","items":{"$ref":"urn:normify:data.commerce.t-363478a9:MembershipPlan"}},"mySubscription":{"$ref":"urn:normify:data.commerce.t-d8572bb3:MembershipSubscription"},"benefits":{"type":"array","description":"权益","items":{"$ref":"urn:normify:data.commerce.t-571ae86f:MembershipBenefit"}},"autoRenewPrompt":{"type":"boolean","description":"是否提示自动续费"},"error":{"$ref":"urn:normify:data.contract.t-2bb69fd6:ApiError"}},"required":["plans"]}
deps:
  - kind: reference
    to: data.commerce.t-363478a9
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.commerce.t-d8572bb3
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.commerce.t-571ae86f
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-2bb69fd6
    label: {zh: "类型引用", en: "Type reference"}
---
