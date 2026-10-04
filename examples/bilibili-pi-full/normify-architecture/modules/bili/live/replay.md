---
uid: b5f3c50d
id: bili.live.replay
parent: bili.live
state: planned
tags: [planned, "worker:W-LIVE", leaf]
name: {zh: "回放与回放转投稿", en: "Replays and replay-to-video"}
description:
  zh: >
      回放录制、切片、转投稿与生命周期
  en: >
      Replay recording, clipping, publishing as a video and lifecycle
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/live/replay/src/replay.ts"
  - path: "services/live/replay/tests/replay.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/live/replays"
    description:
      zh: >
          生成回放
      en: >
          Create a replay
    input: {module: "bili.live.replay", name: "CreateReplayRequest"}
    output: {module: "bili.live.replay", name: "ReplayAsset"}
  - protocol: http
    method: POST
    path: "/api/v1/live/replays/publish"
    description:
      zh: >
          回放转为投稿草稿（复用投稿主链）
      en: >
          Turn a replay into a draft via the publishing chain
    input: {module: "bili.live.replay", name: "PublishReplayRequest"}
types:
  - name: "ReplayAsset"
    description: {zh: "回放资源", en: "Replay asset"}
    schema: {"type":"object","description":"回放资源 / Replay asset","additionalProperties":false,"properties":{"replayAssetId":{"$ref":"urn:normify:bili.contract.common:Id","description":"回放资源 ID / Replay asset id"},"roomId":{"$ref":"urn:normify:bili.contract.common:Id","description":"直播间 ID / Live room id"},"assetId":{"$ref":"urn:normify:bili.contract.common:Id","description":"媒体资源 ID / Media asset id"},"startedAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"字段 startedAt（语义见对应领域契约） / Field startedAt"},"durationMs":{"type":"integer","description":"时长（毫秒） / Duration in ms"}},"required":["replayAssetId","roomId","assetId","startedAt","durationMs"]}
  - name: "CreateReplayRequest"
    description: {zh: "创建回放请求", en: "Create replay request"}
    schema: {"type":"object","description":"创建回放请求 / Create replay request","additionalProperties":false,"properties":{"roomId":{"$ref":"urn:normify:bili.contract.common:Id","description":"直播间 ID / Live room id"},"streamStartedAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"字段 streamStartedAt（语义见对应领域契约） / Field streamStartedAt"},"durationMs":{"type":"integer","description":"时长（毫秒） / Duration in ms"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["roomId","streamStartedAt","durationMs","idempotencyKey","requestContext"]}
  - name: "PublishReplayRequest"
    description: {zh: "回放转投稿请求", en: "Publish replay request"}
    schema: {"type":"object","description":"回放转投稿请求 / Publish replay request","additionalProperties":false,"properties":{"replayAssetId":{"$ref":"urn:normify:bili.contract.common:Id","description":"回放资源 ID / Replay asset id"},"partitionId":{"$ref":"urn:normify:bili.contract.common:Id","description":"分区 ID / Partition id"},"title":{"type":"string","minLength":1,"description":"标题 / Title"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["replayAssetId","partitionId","title","idempotencyKey","requestContext"]}
deps:
  - kind: call
    to: bili.media.ingest
    label: {zh: "回放原件进入媒体管道", en: "Replay originals enter the"}
  - kind: call
    to: bili.upload.draft
    label: {zh: "复用投稿主链", en: "Reuse the publishing chain"}
  - kind: call
    to: bili.infra.db
    label: {zh: "事务读写与表所有权校验", en: "Transactional persistence and"}
  - kind: event
    to: bili.infra.outbox
    label: {zh: "异步事件出箱与重试", en: "Async event outbox and retry"}
  - kind: reference
    to: bili.contract.common
    label: {zh: "统一 ID/时间/分页/错误契约", en: "Unified id, time, pagination"}
---
