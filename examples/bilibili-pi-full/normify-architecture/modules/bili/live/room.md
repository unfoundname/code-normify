---
uid: 73c977ed
id: bili.live.room
parent: bili.live
state: planned
tags: [planned, "worker:W-LIVE", leaf]
name: {zh: "直播间", en: "Live rooms"}
description:
  zh: >
      房间信息、标题封面、分区、开播状态与封禁
  en: >
      Room metadata, titles and covers, categories, live state and bans
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/live/room/src/room.ts"
  - path: "services/live/room/tests/room.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/live/rooms"
    description:
      zh: >
          创建或更新直播间
      en: >
          Create or update a live room
    input: {module: "bili.live.room", name: "LiveRoomRequest"}
    output: {module: "bili.live.room", name: "LiveRoomView"}
  - protocol: http
    method: POST
    path: "/api/v1/live/rooms/state"
    description:
      zh: >
          切换开播状态
      en: >
          Toggle live state
    input: {module: "bili.live.room", name: "LiveStateRequest"}
    output: {module: "bili.live.room", name: "LiveRoomView"}
types:
  - name: "LiveRoomView"
    description: {zh: "直播间视图", en: "Live room view"}
    schema: {"type":"object","description":"直播间视图 / Live room view","additionalProperties":false,"properties":{"roomId":{"$ref":"urn:normify:bili.contract.common:Id","description":"直播间 ID / Live room id"},"ownerId":{"$ref":"urn:normify:bili.contract.common:Id","description":"所有者用户 ID / Owner user id"},"title":{"type":"string","minLength":1,"description":"标题 / Title"},"coverUrl":{"type":"string","minLength":1,"format":"uri","description":"封面地址 / Cover url"},"partitionId":{"$ref":"urn:normify:bili.contract.common:Id","description":"分区 ID / Partition id"},"status":{"type":"string","enum":["OFFLINE","PREPARING","LIVE","BANNED"],"description":"状态 / Status"},"viewerCount":{"type":"integer","description":"字段 viewerCount（语义见对应领域契约） / Field viewerCount"}},"required":["roomId","ownerId","title","coverUrl","partitionId","status","viewerCount"]}
  - name: "LiveStateRequest"
    description: {zh: "开播状态切换请求", en: "Live state request"}
    schema: {"type":"object","description":"开播状态切换请求 / Live state request","additionalProperties":false,"properties":{"roomId":{"$ref":"urn:normify:bili.contract.common:Id","description":"直播间 ID / Live room id"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["roomId","idempotencyKey","requestContext"]}
  - name: "LiveRoomRequest"
    description: {zh: "直播间视图写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定）", en: "Live room view write request carrying only client-provided fields"}
    schema: {"type":"object","description":"直播间视图写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定） / Live room view write request carrying only client-provided fields","additionalProperties":false,"properties":{"roomId":{"$ref":"urn:normify:bili.contract.common:Id","description":"直播间 ID / Live room id"},"title":{"type":"string","minLength":1,"description":"标题 / Title"},"coverUrl":{"type":"string","minLength":1,"format":"uri","description":"封面地址 / Cover url"},"partitionId":{"$ref":"urn:normify:bili.contract.common:Id","description":"分区 ID / Partition id"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["roomId","title","coverUrl","partitionId","idempotencyKey","requestContext"]}
deps:
  - kind: call
    to: bili.live.apply
    label: {zh: "校验开播权限", en: "Check streaming permission"}
  - kind: call
    to: bili.catalog.taxonomy
    label: {zh: "直播分区归属", en: "Live category membership"}
  - kind: call
    to: bili.playback.grant
    label: {zh: "直播播放走统一授权", en: "Live playback uses the unified"}
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
