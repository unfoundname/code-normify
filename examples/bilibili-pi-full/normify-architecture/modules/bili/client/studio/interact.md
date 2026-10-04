---
uid: 4f97fbf7
id: bili.client.studio.interact
parent: bili.client.studio
state: planned
tags: [planned, "worker:W-CREATOR", leaf]
name: {zh: "弹幕与评论管理台", en: "Danmaku and comment console"}
description:
  zh: >
      集中管理弹幕与评论、关键词与批量处理
  en: >
      Centralized danmaku and comment handling, keywords and bulk actions
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/studio/src/features/interact/InteractConsole.tsx"
  - path: "apps/studio/tests/features/interact/InteractConsole.test.tsx"
apis:
  - protocol: http
    method: GET
    path: "/studio/interact"
    description:
      zh: >
          互动管理路由
      en: >
          Interaction console route
    output: {module: "bili.client.studio.interact", name: "InteractConsoleModel"}
types:
  - name: "InteractConsoleModel"
    description: {zh: "互动管理模型", en: "Interaction console model"}
    schema: {"type":"object","description":"互动管理模型 / Interaction console model","additionalProperties":false,"properties":{"items":{"type":"array","items":{"$ref":"urn:normify:bili.danmaku.segment:DanmakuItem"},"description":"结果列表 / Result items"},"comments":{"type":"array","items":{"$ref":"urn:normify:bili.community.comment:CommentView"},"description":"字段 comments（语义见对应领域契约） / Field comments"},"keywords":{"type":"array","items":{"type":"string","minLength":1},"description":"字段 keywords（语义见对应领域契约） / Field keywords"}},"required":["items","comments","keywords"]}
deps:
  - kind: call
    to: bili.creator.interact
    label: {zh: "互动管理动作", en: "Interaction management actions"}
  - kind: call
    to: bili.client.shared.http
    label: {zh: "统一请求层与错误形态", en: "Unified request layer and"}
  - kind: reference
    to: bili.client.shared.design
    label: {zh: "设计系统与组件", en: "Design system and components"}
---
