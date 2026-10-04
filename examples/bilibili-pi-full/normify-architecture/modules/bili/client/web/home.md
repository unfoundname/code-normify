---
uid: 0d599d02
id: bili.client.web.home
parent: bili.client.web
state: planned
tags: [planned, "worker:W-DISCOVER", leaf]
name: {zh: "首页", en: "Home page"}
description:
  zh: >
      推荐流、分区入口、运营位与下拉刷新
  en: >
      Recommendation feed, partition entries, operations slots and pull-to-refresh
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/web/src/features/home/HomePage.tsx"
  - path: "apps/web/tests/features/home/HomePage.test.tsx"
apis:
  - protocol: http
    method: GET
    path: "/"
    description:
      zh: >
          首页路由
      en: >
          Home route
    output: {module: "bili.client.web.home", name: "HomePageModel"}
types:
  - name: "HomePageModel"
    description: {zh: "首页视图模型", en: "Home page model"}
    schema: {"type":"object","description":"首页视图模型 / Home page model","additionalProperties":false,"properties":{"groups":{"type":"array","items":{"$ref":"urn:normify:bili.discover.home:HomeSlotGroup"},"description":"字段 groups（语义见对应领域契约） / Field groups"},"personalized":{"type":"boolean","description":"字段 personalized（语义见对应领域契约） / Field personalized"}},"required":["groups","personalized"]}
deps:
  - kind: call
    to: bili.discover.home
    label: {zh: "首页聚合接口", en: "Home aggregation API"}
  - kind: call
    to: bili.discover.timeline
    label: {zh: "公共时间线", en: "Public timeline"}
  - kind: call
    to: bili.client.shared.http
    label: {zh: "统一请求层与错误形态", en: "Unified request layer and"}
  - kind: reference
    to: bili.client.shared.design
    label: {zh: "设计系统与组件", en: "Design system and components"}
---
