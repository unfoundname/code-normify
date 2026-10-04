---
uid: 1674bb7f
id: bili.client.web.features.live
parent: bili.client.web.features
state: planned
tags: ["worker:web-live"]
name: {zh: "直播前端", en: "Live Feature"}
description:
  zh: >
      直播间页面、开播设置向导、礼物面板与连击、舰队与醒目留言展示、预约与回放页。
      
  en: >
      Live room page, streaming setup wizard, gift panel with combos, guards and super chat, reservations, replays.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/web/src/features/live/index.ts"
  - path: "apps/web/src/features/live/pages/LiveRoomPage.tsx"
  - path: "apps/web/src/features/live/pages/AnchorConsolePage.tsx"
  - path: "apps/web/src/features/live/tests/live.test.tsx"
apis: []
types:
  - name: "LiveRoomPageState"
    description: {zh: "直播间页面状态", en: "Live room page state"}
    schema: {"type":"object","additionalProperties":false,"properties":{"room":{"$ref":"urn:normify:bili.live.room:LiveRoom"},"messages":{"type":"array","description":"最近消息","items":{"$ref":"urn:normify:bili.live.danmaku:LiveDanmakuMessage"}},"danmakuPaused":{"type":"boolean","description":"弹幕是否暂停"},"giftPanelOpen":{"type":"boolean","description":"礼物面板是否展开"},"superChatPinned":{"type":"array","description":"置顶醒目留言","items":{"$ref":"urn:normify:bili.live.gift:GiftLedgerEntry"}},"playerProtocol":{"type":"string","enum":["hls","webrtc","flv"],"description":"播放协议"},"error":{"$ref":"urn:normify:bili.contract.core.errors:ApiError"}},"required":["room","playerProtocol"]}
  - name: "AnchorConsoleState"
    description: {zh: "主播控制台状态", en: "Anchor console state"}
    schema: {"type":"object","additionalProperties":false,"properties":{"qualification":{"$ref":"urn:normify:bili.live.anchor:AnchorQualification"},"room":{"$ref":"urn:normify:bili.live.room:LiveRoom"},"streamTicket":{"$ref":"urn:normify:bili.live.room:LiveStreamTicket"},"bitrateKbps":{"type":"integer","description":"当前上行码率","minimum":0},"droppedFrames":{"type":"integer","description":"丢帧数","minimum":0},"policy":{"$ref":"urn:normify:bili.live.danmaku:LiveDanmakuPolicy"}},"required":["room","bitrateKbps"]}
deps:
  - kind: call
    to: bili.live.room
    to_api: "GET /api/v1/live/rooms/{id}"
    label: {zh: "直播间与推流", en: "Rooms and streaming"}
  - kind: call
    to: bili.live.danmaku
    to_api: "POST /api/v1/live/rooms/{id}/danmaku"
    label: {zh: "实时弹幕", en: "Live danmaku"}
  - kind: call
    to: bili.live.gift
    to_api: "POST /api/v1/live/rooms/{id}/gifts"
    label: {zh: "礼物与舰队", en: "Gifts and guards"}
  - kind: call
    to: bili.live.anchor
    to_api: "GET /api/v1/live/anchor-applications/me"
    label: {zh: "主播准入状态", en: "Anchor onboarding"}
  - kind: call
    to: bili.live.replay
    to_api: "GET /api/v1/live/replays/{id}"
    label: {zh: "回放列表", en: "Replays"}
---
