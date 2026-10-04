---
uid: 1e7a8296
id: bili.live.replay
parent: bili.live
state: planned
tags: ["worker:live-replay"]
name: {zh: "回放与回放转投稿", en: "Replays and Promote to Video"}
description:
  zh: >
      直播录制归档、转码与清晰度、回放播放授权、精彩片段裁剪与转正式投稿（复用媒体与投稿主链）。
      
  en: >
      Recording archive, transcode and renditions, replay playback grant, clip trimming and promote to a video.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/live/replay/src/archive.ts"
  - path: "services/live/replay/src/promote.ts"
  - path: "services/live/replay/migrations/0001_live_replay.sql"
  - path: "services/live/replay/tests/replay.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/live/replays/{id}"
    description:
      zh: >
          读取回放
          
      en: >
          Get replay
          
    output: {module: "bili.live.replay", name: "LiveReplay"}
  - protocol: http
    method: POST
    path: "/api/v1/live/replays/{id}/clips"
    description:
      zh: >
          裁剪精彩片段
          
      en: >
          Create clip
          
    input: {module: "bili.live.replay", name: "ReplayClipRequest"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: POST
    path: "/api/v1/live/replays/{id}/promote-to-video"
    description:
      zh: >
          回放转正式投稿
          
      en: >
          Promote to submission
          
    input: {module: "bili.live.replay", name: "PromoteToVideoRequest"}
    output: {module: "bili.publish.submission", name: "VideoSubmission"}
  - protocol: mysql
    path: "live_replay"
    description:
      zh: >
          直播回放表（唯一写入所有者：回放服务）
          
      en: >
          live_replay table
          
types:
  - name: "LiveReplay"
    description: {zh: "直播回放", en: "Live replay"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 live_replay；媒体二进制存 OSS","properties":{"replayId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"roomId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"anchorId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"title":{"type":"string","description":"回放标题","maxLength":80},"state":{"type":"string","enum":["recording","archiving","transcoding","ready","failed","deleted"],"description":"状态机"},"durationMs":{"type":"integer","description":"时长毫秒","minimum":0},"recordedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"renditions":{"type":"array","description":"档位","items":{"type":"string","description":"档位 id"}},"coverAssetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"sourceAssetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"retentionDays":{"type":"integer","description":"保留天数","minimum":0}},"required":["replayId","roomId","anchorId","state","recordedAt"]}
  - name: "ReplayClipRequest"
    description: {zh: "回放裁剪请求", en: "Replay clip request"}
    schema: {"type":"object","additionalProperties":false,"properties":{"replayId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"startMs":{"type":"integer","description":"起点毫秒","minimum":0},"endMs":{"type":"integer","description":"终点毫秒","minimum":1},"title":{"type":"string","description":"片段标题","maxLength":80},"idempotencyKey":{"$ref":"urn:normify:bili.contract.core.idempotency:IdempotencyKey"}},"required":["replayId","startMs","endMs","idempotencyKey"]}
  - name: "PromoteToVideoRequest"
    description: {zh: "回放转投稿请求", en: "Promote to video request"}
    schema: {"type":"object","additionalProperties":false,"description":"复用投稿与媒体主链，不新建旁路发布通道","properties":{"replayId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"title":{"type":"string","description":"标题","maxLength":80},"partitionId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"tags":{"type":"array","description":"标签","items":{"type":"string","description":"标签"}},"visibility":{"$ref":"urn:normify:bili.contract.core.ids:Visibility"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.core.idempotency:IdempotencyKey"}},"required":["replayId","title","partitionId","idempotencyKey"]}
deps:
  - kind: call
    to: bili.media.asset
    from_api: "POST /api/v1/live/replays/{id}/clips"
    to_api: "POST /api/v1/media/assets"
    label: {zh: "登记录制原件与产物", en: "Register recording assets"}
  - kind: call
    to: bili.media.processing
    label: {zh: "回放转码与切片", en: "Transcode replay"}
  - kind: call
    to: bili.publish.submission
    from_api: "POST /api/v1/live/replays/{id}/promote-to-video"
    to_api: "POST /api/v1/submissions"
    label: {zh: "转投稿复用投稿主链", en: "Promote via submission chain"}
  - kind: call
    to: bili.media.asset
    label: {zh: "回放播放走统一授权", en: "Playback via unified grant"}
  - kind: event
    to: bili.contract.core.events
    label: {zh: "回放就绪事件", en: "Replay ready events"}
---
