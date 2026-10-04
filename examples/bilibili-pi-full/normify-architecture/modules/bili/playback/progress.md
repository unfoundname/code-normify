---
uid: 542888bc
id: bili.playback.progress
parent: bili.playback
state: planned
tags: [planned, "worker:W-PLAYBACK", leaf]
name: {zh: "播放进度", en: "Playback progress"}
description:
  zh: >
      心跳上报、进度合并、完成度与续播点
  en: >
      Heartbeat reports, progress merge, completion ratio and resume point
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/playback/progress/src/progress.ts"
  - path: "services/playback/progress/tests/progress.test.ts"
apis:
  - protocol: http
    method: PUT
    path: "/api/v1/playback/progress"
    description:
      zh: >
          上报播放进度
      en: >
          Report playback progress
    input: {module: "bili.playback.progress", name: "PlaybackProgressRequest"}
    output: {module: "bili.playback.progress", name: "PlaybackProgress"}
types:
  - name: "PlaybackProgress"
    description: {zh: "播放进度", en: "Playback progress"}
    schema: {"type":"object","description":"播放进度 / Playback progress","additionalProperties":false,"properties":{"userId":{"$ref":"urn:normify:bili.contract.common:Id","description":"用户 ID / User id"},"bvid":{"type":"string","minLength":1,"description":"视频业务号（BV 号） / Video business id"},"progressMs":{"type":"integer","description":"播放进度（毫秒） / Playback progress in ms"},"finished":{"type":"boolean","description":"字段 finished（语义见对应领域契约） / Field finished"},"updatedAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"更新时间 / Updated time"}},"required":["userId","bvid","progressMs","finished","updatedAt"]}
  - name: "PlaybackProgressRequest"
    description: {zh: "播放进度写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定）", en: "Playback progress write request carrying only client-provided fields"}
    schema: {"type":"object","description":"播放进度写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定） / Playback progress write request carrying only client-provided fields","additionalProperties":false,"properties":{"bvid":{"type":"string","minLength":1,"description":"视频业务号（BV 号） / Video business id"},"progressMs":{"type":"integer","description":"播放进度（毫秒） / Playback progress in ms"},"finished":{"type":"boolean","description":"字段 finished（语义见对应领域契约） / Field finished"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["bvid","progressMs","finished","idempotencyKey","requestContext"]}
deps:
  - kind: event
    to: bili.infra.outbox
    label: {zh: "进度事件驱动历史与统计投影", en: "Progress events feed history"}
  - kind: call
    to: bili.infra.db
    label: {zh: "事务读写与表所有权校验", en: "Transactional persistence and"}
  - kind: reference
    to: bili.contract.common
    label: {zh: "统一 ID/时间/分页/错误契约", en: "Unified id, time, pagination"}
---
