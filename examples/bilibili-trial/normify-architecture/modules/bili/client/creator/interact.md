---
uid: f7c1adc6
id: bili.client.creator.interact
parent: bili.client.creator
state: planned
tags: ["worker:stu-interact"]
name: {zh: "弹幕评论管理页", en: "Interaction Moderation UI"}
description:
  zh: >
      弹幕/评论检索列表、批量删除与禁言、先审后发开关。
      
  en: >
      Danmaku/comment search list, batch delete and mute, review-first toggle.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/studio/src/features/interact/index.ts"
  - path: "apps/studio/src/features/interact/pages/InteractionModerationPage.tsx"
  - path: "apps/studio/src/features/interact/tests/interact.test.tsx"
apis: []
types:
  - name: "InteractionModerationState"
    description: {zh: "互动管理状态", en: "Interaction moderation state"}
    schema: {"type":"object","additionalProperties":false,"properties":{"query":{"$ref":"urn:normify:bili.creator.moderation:CreatorInteractionQuery"},"items":{"type":"array","description":"条目","items":{"$ref":"urn:normify:bili.creator.moderation:CreatorInteractionItem"}},"selection":{"type":"array","description":"已选条目","items":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"}},"reviewFirstEnabled":{"type":"boolean","description":"是否开启先审后发"},"error":{"$ref":"urn:normify:bili.contract.core.errors:ApiError"}},"required":["items"]}
deps:
  - kind: call
    to: bili.creator.moderation
    to_api: "GET /api/v1/creator/interactions"
    label: {zh: "互动检索与管理动作", en: "Search and moderation"}
---
