---
uid: 276e966e
id: bili.client.web.video
parent: bili.client.web
state: planned
tags: [planned, "worker:W-PLAYBACK", leaf]
name: {zh: "播放页", en: "Playback page"}
description:
  zh: >
      播放器集成、弹幕层、详情与评论、连播与稍后再看
  en: >
      Player integration, danmaku layer, detail and comments, autoplay and watch later
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/web/src/features/video/VideoPage.tsx"
  - path: "apps/web/src/features/video/danmaku-panel.tsx"
  - path: "apps/web/tests/features/video/VideoPage.test.tsx"
  - path: "apps/web/tests/features/video/danmaku-panel.test.tsx"
apis:
  - protocol: http
    method: GET
    path: "/video/:bvid"
    description:
      zh: >
          播放页路由
      en: >
          Playback route
    output: {module: "bili.client.web.video", name: "VideoPageModel"}
types:
  - name: "VideoPageModel"
    description: {zh: "播放页视图模型", en: "Playback page model"}
    schema: {"type":"object","description":"播放页视图模型 / Playback page model","additionalProperties":false,"properties":{"detail":{"$ref":"urn:normify:bili.playback.detail:PlaybackDetailView","description":"字段 detail（语义见对应领域契约） / Field detail"},"playlist":{"$ref":"urn:normify:bili.playback.stream:StreamPlaylist","description":"字段 playlist（语义见对应领域契约） / Field playlist"},"progressMs":{"type":"integer","description":"播放进度（毫秒） / Playback progress in ms"}},"required":["detail","playlist","progressMs"]}
deps:
  - kind: call
    to: bili.playback.detail
    from_api: "GET /video/:bvid"
    to_api: "GET /api/v1/playback/detail/:bvid"
    label: {zh: "详情聚合", en: "Detail aggregation"}
  - kind: call
    to: bili.playback.grant
    label: {zh: "申请播放授权", en: "Request a playback grant"}
  - kind: call
    to: bili.danmaku.segment
    from_api: "GET /video/:bvid"
    to_api: "GET /api/v1/danmaku/videos/:bvid/segments"
    label: {zh: "分段拉取弹幕", en: "Fetch danmaku segments"}
  - kind: call
    to: bili.community.comment
    label: {zh: "评论列表与发布", en: "Comment list and posting"}
  - kind: call
    to: bili.client.shared.http
    label: {zh: "统一请求层与错误形态", en: "Unified request layer and"}
  - kind: reference
    to: bili.client.shared.design
    label: {zh: "设计系统与组件", en: "Design system and components"}
---
