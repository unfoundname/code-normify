---
uid: e5303a52
id: bili.client.web.features.danmaku
parent: bili.client.web.features
state: planned
tags: ["worker:web-danmaku"]
name: {zh: "弹幕前端", en: "Danmaku Feature"}
description:
  zh: >
      弹幕渲染层、发送器、样式选择、屏蔽设置面板、举报与 UP 主管理界面。
      
  en: >
      Danmaku renderer, composer, style picker, block settings, reporting and up-owner moderation UI.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/web/src/features/danmaku/index.ts"
  - path: "apps/web/src/features/danmaku/components/DanmakuLayer.tsx"
  - path: "apps/web/src/features/danmaku/pages/DanmakuSettingsPage.tsx"
  - path: "apps/web/src/features/danmaku/tests/danmaku.test.tsx"
apis: []
types:
  - name: "DanmakuLayerState"
    description: {zh: "弹幕层状态", en: "Danmaku layer state"}
    schema: {"type":"object","additionalProperties":false,"properties":{"videoId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"currentSegmentIndex":{"type":"integer","description":"当前分片","minimum":0},"loadedSegments":{"type":"integer","description":"已加载分片数","minimum":0},"renderedCount":{"type":"integer","description":"当前渲染数","minimum":0},"paused":{"type":"boolean","description":"是否暂停弹幕"},"filteredCount":{"type":"integer","description":"被屏蔽数量","minimum":0}},"required":["videoId","currentSegmentIndex","paused"]}
  - name: "DanmakuComposerState"
    description: {zh: "发送器状态", en: "Composer state"}
    schema: {"type":"object","additionalProperties":false,"properties":{"draft":{"type":"string","description":"草稿","maxLength":100},"mode":{"type":"string","enum":["scroll","top","bottom","reverse"],"description":"模式"},"colorHex":{"type":"string","description":"颜色"},"fontSize":{"type":"string","enum":["small","medium","large"],"description":"字号"},"cooldownRemainingMs":{"type":"integer","description":"冷却剩余毫秒","minimum":0},"quotaRemaining":{"type":"integer","description":"今日剩余配额","minimum":0},"error":{"$ref":"urn:normify:bili.contract.core.errors:ApiError"}},"required":["draft","mode"]}
deps:
  - kind: call
    to: bili.danmaku.stream
    to_api: "GET /api/v1/danmaku/{videoId}/segments"
    label: {zh: "分片拉取与实时订阅", en: "Segments and realtime"}
  - kind: call
    to: bili.danmaku.post
    to_api: "POST /api/v1/danmaku"
    label: {zh: "发送与举报", en: "Post and report"}
  - kind: call
    to: bili.danmaku.prefs
    to_api: "PUT /api/v1/danmaku/preferences"
    label: {zh: "偏好与屏蔽规则", en: "Preferences and block rules"}
  - kind: call
    to: bili.client.web.shared.realtime
    label: {zh: "弹幕实时通道客户端", en: "Realtime channel client"}
---
