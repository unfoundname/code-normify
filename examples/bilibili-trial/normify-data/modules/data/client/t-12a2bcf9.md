---
uid: 4ed7726c
id: data.client.t-12a2bcf9
parent: data.client
state: planned
tags: ["worker:stu-interact", "projection:data-contract"]
name: {zh: "InteractionModerationState", en: "InteractionModerationState"}
description:
  zh: >
      互动管理状态
  en: >
      Interaction moderation state
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/client/t-12a2bcf9.json"
apis: []
types:
  - name: "InteractionModerationState"
    description: {zh: "互动管理状态", en: "Interaction moderation state"}
    schema: {"type":"object","additionalProperties":false,"properties":{"query":{"$ref":"urn:normify:data.creator.t-d4cb6418:CreatorInteractionQuery"},"items":{"type":"array","description":"条目","items":{"$ref":"urn:normify:data.creator.t-ea919212:CreatorInteractionItem"}},"selection":{"type":"array","description":"已选条目","items":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"}},"reviewFirstEnabled":{"type":"boolean","description":"是否开启先审后发"},"error":{"$ref":"urn:normify:data.contract.t-2bb69fd6:ApiError"}},"required":["items"]}
deps:
  - kind: reference
    to: data.creator.t-d4cb6418
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.creator.t-ea919212
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-2bb69fd6
    label: {zh: "类型引用", en: "Type reference"}
---
