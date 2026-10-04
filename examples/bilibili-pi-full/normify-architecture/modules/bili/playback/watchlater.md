---
uid: 6fcbaef8
id: bili.playback.watchlater
parent: bili.playback
state: planned
tags: [planned, "worker:W-PLAYBACK", leaf]
name: {zh: "稍后再看", en: "Watch later"}
description:
  zh: >
      加入、移除、排序与容量上限
  en: >
      Add, remove, reorder and capacity limits
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/playback/watchlater/src/watchlater.ts"
  - path: "services/playback/watchlater/tests/watchlater.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/playback/watch-later"
    description:
      zh: >
          加入稍后再看
      en: >
          Add to watch later
    input: {module: "bili.playback.watchlater", name: "WatchLaterItemRequest"}
  - protocol: http
    method: GET
    path: "/api/v1/playback/watch-later"
    description:
      zh: >
          列出稍后再看
      en: >
          List watch later
    output: {module: "bili.playback.watchlater", name: "WatchLaterPage"}
types:
  - name: "WatchLaterItem"
    description: {zh: "稍后再看条目", en: "Watch later item"}
    schema: {"type":"object","description":"稍后再看条目 / Watch later item","additionalProperties":false,"properties":{"userId":{"$ref":"urn:normify:bili.contract.common:Id","description":"用户 ID / User id"},"bvid":{"type":"string","minLength":1,"description":"视频业务号（BV 号） / Video business id"},"addedAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"字段 addedAt（语义见对应领域契约） / Field addedAt"},"orderIndex":{"type":"integer","description":"字段 orderIndex（语义见对应领域契约） / Field orderIndex"}},"required":["userId","bvid","addedAt","orderIndex"]}
  - name: "WatchLaterPage"
    description: {zh: "领域分页响应", en: "Domain page response"}
    schema: {"type":"object","additionalProperties":false,"description":"领域分页响应 / Domain page response｜与 PageResult 完全相同的分页封套字段（items/total/nextCursor/hasMore），items 使用该领域具名条目契约 / Same envelope fields as PageResult with domain-specific typed items","properties":{"items":{"type":"array","items":{"$ref":"urn:normify:bili.playback.watchlater:WatchLaterItem"},"description":"领域条目列表 / Domain item list"},"total":{"type":"integer","minimum":0,"description":"总条数 / Total count"},"nextCursor":{"type":"string","description":"下一页游标 / Next page cursor"},"hasMore":{"type":"boolean","description":"是否还有下一页 / Whether more pages exist"}},"required":["items","hasMore"]}
  - name: "WatchLaterItemRequest"
    description: {zh: "稍后再看条目写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定）", en: "Watch later item write request carrying only client-provided fields"}
    schema: {"type":"object","description":"稍后再看条目写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定） / Watch later item write request carrying only client-provided fields","additionalProperties":false,"properties":{"bvid":{"type":"string","minLength":1,"description":"视频业务号（BV 号） / Video business id"},"orderIndex":{"type":"integer","description":"字段 orderIndex（语义见对应领域契约） / Field orderIndex"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["bvid","orderIndex","idempotencyKey","requestContext"]}
deps:
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
