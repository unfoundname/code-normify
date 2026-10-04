---
uid: bf3d356f
id: bili.playback.history
parent: bili.playback
state: planned
tags: [planned, "worker:W-PLAYBACK", leaf]
name: {zh: "观看历史", en: "Watch history"}
description:
  zh: >
      历史列表、去重、单条删除与隐私策略
  en: >
      History list, dedupe, single-entry deletion and privacy policy
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/playback/history/src/history.ts"
  - path: "services/playback/history/tests/history.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/playback/history"
    description:
      zh: >
          查询观看历史
      en: >
          List watch history
    output: {module: "bili.playback.history", name: "HistoryPage"}
  - protocol: http
    method: DELETE
    path: "/api/v1/playback/history/"
    description:
      zh: >
          删除历史条目
      en: >
          Delete a history entry
    input: {module: "bili.playback.history", name: "DeleteHistoryRequest"}
types:
  - name: "HistoryEntry"
    description: {zh: "历史条目", en: "History entry"}
    schema: {"type":"object","description":"历史条目 / History entry","additionalProperties":false,"properties":{"userId":{"$ref":"urn:normify:bili.contract.common:Id","description":"用户 ID / User id"},"bvid":{"type":"string","minLength":1,"description":"视频业务号（BV 号） / Video business id"},"progressMs":{"type":"integer","description":"播放进度（毫秒） / Playback progress in ms"},"watchedAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"字段 watchedAt（语义见对应领域契约） / Field watchedAt"},"deviceId":{"type":"string","minLength":1,"description":"设备标识 / Device id"}},"required":["userId","bvid","progressMs","watchedAt"]}
  - name: "DeleteHistoryRequest"
    description: {zh: "删除历史请求", en: "Delete history request"}
    schema: {"type":"object","description":"删除历史请求 / Delete history request","additionalProperties":false,"properties":{"bvid":{"type":"string","minLength":1,"description":"视频业务号（BV 号） / Video business id"},"deviceId":{"type":"string","minLength":1,"description":"设备标识 / Device id"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["bvid","idempotencyKey","requestContext"]}
  - name: "HistoryPage"
    description: {zh: "领域分页响应", en: "Domain page response"}
    schema: {"type":"object","additionalProperties":false,"description":"领域分页响应 / Domain page response｜与 PageResult 完全相同的分页封套字段（items/total/nextCursor/hasMore），items 使用该领域具名条目契约 / Same envelope fields as PageResult with domain-specific typed items","properties":{"items":{"type":"array","items":{"$ref":"urn:normify:bili.playback.history:HistoryEntry"},"description":"领域条目列表 / Domain item list"},"total":{"type":"integer","minimum":0,"description":"总条数 / Total count"},"nextCursor":{"type":"string","description":"下一页游标 / Next page cursor"},"hasMore":{"type":"boolean","description":"是否还有下一页 / Whether more pages exist"}},"required":["items","hasMore"]}
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
