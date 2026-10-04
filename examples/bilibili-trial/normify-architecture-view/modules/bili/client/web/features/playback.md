---
uid: 2ea5675c
id: bili.client.web.features.playback
parent: bili.client.web.features
state: planned
tags: ["worker:web-playback"]
name: {zh: "播放页前端", en: "Playback Feature"}
description:
  zh: >
      视频详情页与播放器页面：清晰度/字幕/倍速/全屏切换、连续播放、进度上报、稍后再看、相关推荐。
      
  en: >
      Detail and player pages: quality/subtitle/speed/fullscreen, autoplay, progress reporting, watch later, related.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/web/src/features/playback/index.ts"
  - path: "apps/web/src/features/playback/pages/VideoDetailPage.tsx"
  - path: "apps/web/src/features/playback/hooks/usePlaybackGrant.ts"
  - path: "apps/web/src/features/playback/tests/playback.test.tsx"
apis: []
types:
  - name: "PlayerPageState"
    description: {zh: "播放页状态", en: "Player page state"}
    schema: {"type":"object","additionalProperties":false,"properties":{"videoId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"detail":{"$ref":"urn:normify:bili.playback.detail:VideoDetailView"},"grant":{"$ref":"urn:normify:bili.contract.media.playback:PlaybackGrant"},"qualityOptions":{"type":"array","description":"可选清晰度","items":{"type":"string","description":"清晰度"}},"activeQuality":{"type":"string","description":"当前清晰度"},"activeSubtitleLang":{"type":"string","description":"当前字幕语言"},"playbackRate":{"type":"integer","description":"倍速 ×100","minimum":50,"maximum":400},"theaterMode":{"type":"boolean","description":"是否剧场模式"},"error":{"$ref":"urn:normify:bili.contract.core.errors:ApiError"}},"required":["videoId","activeQuality","playbackRate"]}
  - name: "ResumeDecision"
    description: {zh: "续播决策", en: "Resume decision"}
    schema: {"type":"object","additionalProperties":false,"properties":{"mode":{"type":"string","enum":["continue_next","resume_position","restart"],"description":"续播方式"},"positionMs":{"type":"integer","description":"起播位置毫秒","minimum":0},"reason":{"type":"string","description":"决策原因"}},"required":["mode","positionMs"]}
deps:
  - kind: call
    to: bili.playback.grant
    to_api: "POST /api/v1/playback/grants"
    label: {zh: "获取播放票据", en: "Fetch playback grant"}
  - kind: call
    to: bili.playback.detail
    to_api: "GET /api/v1/videos/{videoId}/detail"
    label: {zh: "详情聚合与连播队列", en: "Detail and autoplay queue"}
  - kind: call
    to: bili.playback.progress
    to_api: "POST /api/v1/playback/progress"
    label: {zh: "进度上报与稍后再看", en: "Progress and watch later"}
  - kind: call
    to: bili.danmaku.stream
    to_api: "GET /api/v1/danmaku/{videoId}/segments"
    label: {zh: "按分片拉取弹幕", en: "Fetch danmaku segments"}
  - kind: call
    to: bili.client.web.shared.player
    label: {zh: "播放器内核与全屏/倍速能力", en: "Player core"}
---
