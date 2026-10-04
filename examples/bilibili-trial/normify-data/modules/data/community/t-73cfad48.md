---
uid: 8d9057d3
id: data.community.t-73cfad48
parent: data.community
state: planned
tags: ["worker:com-comment", "projection:data-contract"]
name: {zh: "CommentModerationRequest", en: "CommentModerationRequest"}
description:
  zh: >
      评论管理动作
  en: >
      Comment moderation action
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/community/t-73cfad48.json"
apis: []
types:
  - name: "CommentModerationRequest"
    description: {zh: "评论管理动作", en: "Comment moderation action"}
    schema: {"type":"object","additionalProperties":false,"description":"仅 UP 主或具备权限码者可用","properties":{"commentId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"operatorId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"action":{"type":"string","enum":["pin","unpin","feature","unfeature","hide","delete","restore"],"description":"动作"},"reason":{"type":"string","description":"原因"},"idempotencyKey":{"$ref":"urn:normify:data.contract.t-8cc5302d:IdempotencyKey"}},"required":["commentId","operatorId","action","idempotencyKey"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-8cc5302d
    label: {zh: "类型引用", en: "Type reference"}
---
