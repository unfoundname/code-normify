---
uid: d35c4663
id: bili.client.web.space
parent: bili.client.web
state: planned
tags: [planned, "worker:W-SOCIAL", leaf]
name: {zh: "个人空间", en: "Personal space"}
description:
  zh: >
      资料卡、代表作、投稿列表、合集与关注操作
  en: >
      Profile card, pinned works, upload lists, collections and follow actions
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/web/src/features/space/SpacePage.tsx"
  - path: "apps/web/tests/features/space/SpacePage.test.tsx"
apis:
  - protocol: http
    method: GET
    path: "/space/:mid"
    description:
      zh: >
          个人空间路由
      en: >
          Space route
    output: {module: "bili.client.web.space", name: "SpacePageModel"}
types:
  - name: "SpacePageModel"
    description: {zh: "空间视图模型", en: "Space page model"}
    schema: {"type":"object","description":"空间视图模型 / Space page model","additionalProperties":false,"properties":{"profile":{"$ref":"urn:normify:bili.identity.profile:ProfileView","description":"字段 profile（语义见对应领域契约） / Field profile"},"space":{"$ref":"urn:normify:bili.identity.profile:SpaceView","description":"字段 space（语义见对应领域契约） / Field space"},"following":{"type":"boolean","description":"字段 following（语义见对应领域契约） / Field following"}},"required":["profile","space","following"]}
deps:
  - kind: call
    to: bili.identity.profile
    label: {zh: "资料与空间数据", en: "Profile and space data"}
  - kind: call
    to: bili.catalog.query
    label: {zh: "投稿列表", en: "Upload list"}
  - kind: call
    to: bili.social.follow
    label: {zh: "关注操作", en: "Follow actions"}
  - kind: call
    to: bili.client.shared.http
    label: {zh: "统一请求层与错误形态", en: "Unified request layer and"}
  - kind: reference
    to: bili.client.shared.design
    label: {zh: "设计系统与组件", en: "Design system and components"}
---
