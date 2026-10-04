---
uid: c539d5d8
id: bili.client.web.dynamic
parent: bili.client.web
state: planned
tags: [planned, "worker:W-SOCIAL", leaf]
name: {zh: "动态页", en: "Dynamic feed page"}
description:
  zh: >
      关注动态流、发布动态、话题与转发
  en: >
      Following feed, dynamic posting, topics and forwarding
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/web/src/features/dynamic/DynamicPage.tsx"
  - path: "apps/web/tests/features/dynamic/DynamicPage.test.tsx"
apis:
  - protocol: http
    method: GET
    path: "/dynamic"
    description:
      zh: >
          动态页路由
      en: >
          Dynamic route
    output: {module: "bili.client.web.dynamic", name: "DynamicPageModel"}
types:
  - name: "DynamicPageModel"
    description: {zh: "动态页视图模型", en: "Dynamic page model"}
    schema: {"type":"object","description":"动态页视图模型 / Dynamic page model","additionalProperties":false,"properties":{"feed":{"$ref":"urn:normify:bili.social.feed:FeedPage","description":"字段 feed（语义见对应领域契约） / Field feed"},"topics":{"type":"array","items":{"$ref":"urn:normify:bili.social.topic:TopicView"},"description":"字段 topics（语义见对应领域契约） / Field topics"}},"required":["feed","topics"]}
deps:
  - kind: call
    to: bili.social.feed
    label: {zh: "动态流", en: "Feed"}
  - kind: call
    to: bili.social.dynamic
    label: {zh: "发布动态", en: "Publish a dynamic"}
  - kind: call
    to: bili.client.shared.http
    label: {zh: "统一请求层与错误形态", en: "Unified request layer and"}
  - kind: reference
    to: bili.client.shared.design
    label: {zh: "设计系统与组件", en: "Design system and components"}
---
