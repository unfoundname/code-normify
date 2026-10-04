---
uid: "50352517"
id: data.community.t-ecf4efa3
parent: data.community
state: planned
tags: ["worker:com-reaction", "projection:data-contract"]
name: {zh: "ToggleReactionRequest", en: "ToggleReactionRequest"}
description:
  zh: >
      点赞切换请求
  en: >
      Toggle reaction
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/community/t-ecf4efa3.json"
apis: []
types:
  - name: "ToggleReactionRequest"
    description: {zh: "点赞切换请求", en: "Toggle reaction"}
    schema: {"type":"object","additionalProperties":false,"properties":{"targetType":{"type":"string","enum":["video","dynamic","comment","article","danmaku"],"description":"目标类型"},"targetId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"kind":{"type":"string","enum":["like","dislike"],"description":"类型"},"desired":{"type":"boolean","description":"目标状态（true 点赞）"},"idempotencyKey":{"$ref":"urn:normify:data.contract.t-8cc5302d:IdempotencyKey"}},"required":["targetType","targetId","kind","desired","idempotencyKey"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-8cc5302d
    label: {zh: "类型引用", en: "Type reference"}
---
