---
uid: ea3c1bbb
id: data.creator.t-f8b19ca9
parent: data.creator
state: planned
tags: ["worker:cre-interact", "projection:data-contract"]
name: {zh: "CreatorInteractionAction", en: "CreatorInteractionAction"}
description:
  zh: >
      互动管理动作
  en: >
      Interaction action
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/creator/t-f8b19ca9.json"
apis: []
types:
  - name: "CreatorInteractionAction"
    description: {zh: "互动管理动作", en: "Interaction action"}
    schema: {"type":"object","additionalProperties":false,"description":"动作翻译为弹幕/评论领域命令，禁止直改对方表","properties":{"itemIds":{"type":"array","description":"条目 id","items":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"minItems":1,"maxItems":100},"itemType":{"type":"string","enum":["danmaku","comment"],"description":"类型"},"action":{"type":"string","enum":["delete","hide","restore","pin","feature","mute_author_in_video","ban_author_in_video","enable_review_first"],"description":"动作"},"videoId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"reason":{"type":"string","description":"原因"},"idempotencyKey":{"$ref":"urn:normify:data.contract.t-8cc5302d:IdempotencyKey"}},"required":["itemIds","itemType","action","idempotencyKey"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-8cc5302d
    label: {zh: "类型引用", en: "Type reference"}
---
