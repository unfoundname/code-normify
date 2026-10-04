---
uid: 1104b03a
id: bili.client.web.shared.realtime
parent: bili.client.web.shared
state: planned
tags: ["worker:web-shell"]
name: {zh: "实时通道客户端", en: "Realtime Client"}
description:
  zh: >
      WebSocket 客户端：弹幕与直播消息订阅、心跳、断线重连、本地缓冲；连接端点待部署确认。
      
  en: >
      WebSocket client for danmaku and live streams with heartbeat and resubscribe.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/web/src/shared/realtime/connection.ts"
  - path: "apps/web/src/shared/realtime/subscriptions.ts"
apis:
  - protocol: ws
    path: "/ws/v1/danmaku/{videoId}"
    description:
      zh: >
          弹幕实时通道
          
      en: >
          Danmaku realtime channel
          
    output: {module: "bili.client.web.shared.realtime", name: "RealtimeFrame"}
  - protocol: ws
    path: "/ws/v1/live/{roomId}"
    description:
      zh: >
          直播间实时通道
          
      en: >
          Live room realtime channel
          
    output: {module: "bili.client.web.shared.realtime", name: "RealtimeFrame"}
types:
  - name: "RealtimeSubscription"
    description: {zh: "实时订阅", en: "Realtime subscription"}
    schema: {"type":"object","additionalProperties":false,"properties":{"topic":{"type":"string","description":"主题，如 danmaku:{videoId}"},"lastEventId":{"type":"string","description":"断线续传位点"},"bufferMs":{"type":"integer","description":"本地缓冲毫秒","minimum":0},"qos":{"type":"string","enum":["at_most_once","at_least_once"],"description":"服务质量"}},"required":["topic","qos"]}
  - name: "RealtimeFrame"
    description: {zh: "实时帧", en: "Realtime frame"}
    schema: {"type":"object","additionalProperties":false,"properties":{"topic":{"type":"string","description":"主题"},"seq":{"type":"integer","description":"序号","minimum":0},"sentAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"payloadJson":{"type":"string","description":"载荷 JSON"}},"required":["topic","seq","sentAt","payloadJson"]}
deps:
  - kind: call
    to: bili.contract.core.errors
    label: {zh: "统一错误处理", en: "Unified error handling"}
  - kind: call
    to: bili.danmaku.stream
    to_api: "GET /api/v1/danmaku/{videoId}/segments"
    label: {zh: "订阅弹幕分片", en: "Subscribe danmaku segments"}
  - kind: call
    to: bili.live.danmaku
    to_api: "GET /api/v1/live/rooms/{id}/danmaku"
    label: {zh: "订阅直播消息", en: "Subscribe live messages"}
---
