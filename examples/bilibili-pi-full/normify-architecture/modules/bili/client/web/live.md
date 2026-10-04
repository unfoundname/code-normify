---
uid: fbce5247
id: bili.client.web.live
parent: bili.client.web
state: planned
tags: [planned, "worker:W-LIVE", leaf]
name: {zh: "直播页", en: "Live page"}
description:
  zh: >
      直播间播放、实时弹幕、礼物面板、预约与回放
  en: >
      Live room playback, realtime danmaku, gift panel, reservations and replays
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/web/src/features/live/LiveRoom.tsx"
  - path: "apps/web/src/features/live/gift-panel.tsx"
  - path: "apps/web/tests/features/live/LiveRoom.test.tsx"
  - path: "apps/web/tests/features/live/gift-panel.test.tsx"
apis:
  - protocol: http
    method: GET
    path: "/live/:roomId"
    description:
      zh: >
          直播间路由
      en: >
          Live room route
    output: {module: "bili.client.web.live", name: "LiveRoomModel"}
types:
  - name: "LiveRoomModel"
    description: {zh: "直播间视图模型", en: "Live room model"}
    schema: {"type":"object","description":"直播间视图模型 / Live room model","additionalProperties":false,"properties":{"room":{"$ref":"urn:normify:bili.live.room:LiveRoomView","description":"字段 room（语义见对应领域契约） / Field room"},"gifts":{"type":"array","items":{"$ref":"urn:normify:bili.live.gift:GiftCatalogItem"},"description":"字段 gifts（语义见对应领域契约） / Field gifts"},"reserved":{"type":"boolean","description":"字段 reserved（语义见对应领域契约） / Field reserved"}},"required":["room","gifts","reserved"]}
deps:
  - kind: call
    to: bili.live.room
    label: {zh: "直播间信息", en: "Room metadata"}
  - kind: call
    to: bili.live.danmaku
    label: {zh: "实时弹幕连接", en: "Realtime danmaku"}
  - kind: call
    to: bili.live.gift
    label: {zh: "礼物面板与送礼", en: "Gift panel and sending"}
  - kind: call
    to: bili.client.shared.http
    label: {zh: "统一请求层与错误形态", en: "Unified request layer and"}
  - kind: reference
    to: bili.client.shared.design
    label: {zh: "设计系统与组件", en: "Design system and components"}
---
