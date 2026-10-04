---
uid: 4ee2fa11
id: bili.client.studio.dashboard
parent: bili.client.studio
state: planned
tags: [planned, "worker:W-CREATOR", leaf]
name: {zh: "创作总览", en: "Creator dashboard"}
description:
  zh: >
      稿件状态总览、待办与发布建议
  en: >
      Work status overview, todos and publishing suggestions
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/studio/src/features/dashboard/Dashboard.tsx"
  - path: "apps/studio/tests/features/dashboard/Dashboard.test.tsx"
apis:
  - protocol: http
    method: GET
    path: "/studio"
    description:
      zh: >
          创作中心首页路由
      en: >
          Studio home route
    output: {module: "bili.client.studio.dashboard", name: "StudioDashboardModel"}
types:
  - name: "StudioDashboardModel"
    description: {zh: "创作总览模型", en: "Studio dashboard model"}
    schema: {"type":"object","description":"创作总览模型 / Studio dashboard model","additionalProperties":false,"properties":{"works":{"type":"array","items":{"$ref":"urn:normify:bili.creator.manage:CreatorWorkItem"},"description":"字段 works（语义见对应领域契约） / Field works"},"tasks":{"type":"array","items":{"$ref":"urn:normify:bili.creator.activity:CreatorTask"},"description":"字段 tasks（语义见对应领域契约） / Field tasks"}},"required":["works","tasks"]}
deps:
  - kind: call
    to: bili.creator.manage
    label: {zh: "投稿管理", en: "Work management"}
  - kind: call
    to: bili.creator.activity
    label: {zh: "任务与活动", en: "Tasks and campaigns"}
  - kind: call
    to: bili.client.shared.http
    label: {zh: "统一请求层与错误形态", en: "Unified request layer and"}
  - kind: reference
    to: bili.client.shared.design
    label: {zh: "设计系统与组件", en: "Design system and components"}
---
