---
uid: a2775f16
id: bili.client.web.shared.player
parent: bili.client.web.shared
state: planned
tags: ["worker:web-playback"]
name: {zh: "播放器内核封装", en: "Player Core Wrapper"}
description:
  zh: >
      由播放领域 Worker 独占：播放器实例、清晰度/字幕/倍速/全屏/连续播放能力对接 PlaybackGrant。
      
  en: >
      Owned by playback worker: player instance, quality/subtitle/speed/fullscreen/autoplay bound to PlaybackGrant.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/web/src/shared/player/core.ts"
  - path: "apps/web/src/shared/player/controls.ts"
apis: []
types:
  - name: "PlayerOptions"
    description: {zh: "播放器配置", en: "Player options"}
    schema: {"type":"object","additionalProperties":false,"properties":{"grant":{"$ref":"urn:normify:bili.contract.media.playback:PlaybackGrant"},"autoplay":{"type":"boolean","description":"自动播放"},"startPositionMs":{"type":"integer","description":"起播位置毫秒","minimum":0},"quality":{"type":"string","description":"清晰度"},"subtitleLang":{"type":"string","description":"字幕语言"},"playbackRate":{"type":"integer","description":"倍速 ×100（100=1.0x）","minimum":50,"maximum":400},"danmakuEnabled":{"type":"boolean","description":"是否开启弹幕"}},"required":["grant","playbackRate"]}
  - name: "PlayerEvent"
    description: {zh: "播放器事件", en: "Player event"}
    schema: {"type":"object","additionalProperties":false,"properties":{"type":{"type":"string","enum":["play","pause","seek","ended","quality_changed","error","progress"],"description":"事件"},"positionMs":{"type":"integer","description":"位置毫秒","minimum":0},"at":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"error":{"$ref":"urn:normify:bili.contract.core.errors:ApiError"}},"required":["type","positionMs","at"]}
deps:
  - kind: reference
    to: bili.contract.media.playback
    label: {zh: "播放票据契约", en: "Playback grant contract"}
  - kind: call
    to: bili.contract.core.errors
    label: {zh: "播放错误映射", en: "Map playback errors"}
---
