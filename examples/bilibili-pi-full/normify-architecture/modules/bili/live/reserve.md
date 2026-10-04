---
uid: "34180914"
id: bili.live.reserve
parent: bili.live
state: planned
tags: [planned, "worker:W-LIVE", leaf]
name: {zh: "直播预约", en: "Live reservations"}
description:
  zh: >
      预约、开播提醒、分享预约与取消
  en: >
      Reservations, go-live reminders, share reservations and cancellation
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/live/reserve/src/reserve.ts"
  - path: "services/live/reserve/tests/reserve.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/live/reservations"
    description:
      zh: >
          预约直播
      en: >
          Reserve a live stream
    input: {module: "bili.live.reserve", name: "LiveReserveRequest"}
    output: {module: "bili.live.reserve", name: "LiveReserve"}
types:
  - name: "LiveReserve"
    description: {zh: "直播预约", en: "Live reservation"}
    schema: {"type":"object","description":"直播预约 / Live reservation","additionalProperties":false,"properties":{"reserveId":{"$ref":"urn:normify:bili.contract.common:Id","description":"预约 ID / Reserve id"},"userId":{"$ref":"urn:normify:bili.contract.common:Id","description":"用户 ID / User id"},"roomId":{"$ref":"urn:normify:bili.contract.common:Id","description":"直播间 ID / Live room id"},"notifyBeforeSec":{"type":"integer","description":"字段 notifyBeforeSec（语义见对应领域契约） / Field notifyBeforeSec"},"createdAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"创建时间 / Created time"}},"required":["reserveId","userId","roomId","notifyBeforeSec","createdAt"]}
  - name: "LiveReserveRequest"
    description: {zh: "直播预约写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定）", en: "Live reservation write request carrying only client-provided fields"}
    schema: {"type":"object","description":"直播预约写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定） / Live reservation write request carrying only client-provided fields","additionalProperties":false,"properties":{"reserveId":{"$ref":"urn:normify:bili.contract.common:Id","description":"预约 ID / Reserve id"},"roomId":{"$ref":"urn:normify:bili.contract.common:Id","description":"直播间 ID / Live room id"},"notifyBeforeSec":{"type":"integer","description":"字段 notifyBeforeSec（语义见对应领域契约） / Field notifyBeforeSec"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["reserveId","roomId","notifyBeforeSec","idempotencyKey","requestContext"]}
deps:
  - kind: call
    to: bili.message.push
    label: {zh: "开播提醒推送", en: "Go-live reminder push"}
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
