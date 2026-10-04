---
uid: d1f344fa
id: bili.client.web.channel
parent: bili.client.web
state: planned
tags: [planned, "worker:W-CHANNEL", leaf]
name: {zh: "生态频道页", en: "Ecosystem channel pages"}
description:
  zh: >
      专栏阅读、音频播放、漫画阅读、赛事与会员购入口
  en: >
      Article reading, audio playback, manga reading, tournaments and mall entries
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/web/src/features/channel/ArticlePage.tsx"
  - path: "apps/web/src/features/channel/AudioPage.tsx"
  - path: "apps/web/tests/features/channel/ArticlePage.test.tsx"
  - path: "apps/web/tests/features/channel/AudioPage.test.tsx"
apis:
  - protocol: http
    method: GET
    path: "/channel/:kind/:id"
    description:
      zh: >
          生态频道路由
      en: >
          Channel route
    output: {module: "bili.client.web.channel", name: "ChannelPageModel"}
types:
  - name: "ChannelPageModel"
    description: {zh: "频道页视图模型", en: "Channel page model"}
    schema: {"type":"object","description":"频道页视图模型 / Channel page model","additionalProperties":false,"properties":{"kind":{"type":"string","enum":["ARTICLE","AUDIO","MANGA","ESPORTS","MALL"],"description":"字段 kind（语义见对应领域契约） / Field kind"},"resourceId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 resourceId（语义见对应领域契约） / Field resourceId"},"payloadRef":{"type":"string","minLength":1,"description":"字段 payloadRef（语义见对应领域契约） / Field payloadRef"}},"required":["kind","resourceId","payloadRef"]}
deps:
  - kind: call
    to: bili.channel.article
    label: {zh: "专栏内容", en: "Article content"}
  - kind: call
    to: bili.channel.audio
    label: {zh: "音频内容", en: "Audio content"}
  - kind: call
    to: bili.channel.manga
    label: {zh: "漫画章节", en: "Manga chapters"}
  - kind: call
    to: bili.channel.mall
    label: {zh: "会员购商品", en: "Mall goods"}
  - kind: call
    to: bili.client.shared.http
    label: {zh: "统一请求层与错误形态", en: "Unified request layer and"}
  - kind: reference
    to: bili.client.shared.design
    label: {zh: "设计系统与组件", en: "Design system and components"}
---
