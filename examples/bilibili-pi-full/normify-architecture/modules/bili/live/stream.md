---
uid: 162ce5f2
id: bili.live.stream
parent: bili.live
state: planned
tags: [planned, "worker:W-LIVE", leaf]
name: {zh: "推流与连麦", en: "Ingest and co-hosting"}
description:
  zh: >
      推流地址与密钥引用、转码档位、低延迟与连麦信令
  en: >
      Ingest urls and key references, transcode tiers, low latency and co-host signaling
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/live/stream/src/ingest.ts"
  - path: "services/live/stream/src/cohost.ts"
  - path: "services/live/stream/tests/ingest.test.ts"
  - path: "services/live/stream/tests/cohost.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/live/ingest-endpoints"
    description:
      zh: >
          申请推流地址
      en: >
          Request an ingest endpoint
    input: {module: "bili.live.stream", name: "IngestEndpointRequest"}
    output: {module: "bili.live.stream", name: "IngestEndpoint"}
  - protocol: http
    method: POST
    path: "/api/v1/live/cohost-sessions"
    description:
      zh: >
          发起连麦
      en: >
          Start a co-host session
    input: {module: "bili.live.stream", name: "CohostRequest"}
    output: {module: "bili.live.stream", name: "CohostSession"}
types:
  - name: "IngestEndpoint"
    description: {zh: "推流端点", en: "Ingest endpoint"}
    schema: {"type":"object","description":"推流端点 / Ingest endpoint","additionalProperties":false,"properties":{"roomId":{"$ref":"urn:normify:bili.contract.common:Id","description":"直播间 ID / Live room id"},"rtmpUrl":{"type":"string","minLength":1,"format":"uri","description":"字段 rtmpUrl（语义见对应领域契约） / Field rtmpUrl"},"streamKeyRef":{"type":"string","minLength":1,"description":"推流密钥引用（不落明文） / Stream key reference"},"expireAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"过期时间 / Expire time"}},"required":["roomId","rtmpUrl","streamKeyRef","expireAt"]}
  - name: "CohostSession"
    description: {zh: "连麦会话", en: "Co-host session"}
    schema: {"type":"object","description":"连麦会话 / Co-host session","additionalProperties":false,"properties":{"sessionId":{"$ref":"urn:normify:bili.contract.common:Id","description":"会话 ID / Session id"},"hostRoomId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 hostRoomId（语义见对应领域契约） / Field hostRoomId"},"guestRoomId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 guestRoomId（语义见对应领域契约） / Field guestRoomId"},"status":{"type":"string","enum":["INVITING","ACTIVE","ENDED"],"description":"状态 / Status"},"rtcTokenRef":{"type":"string","minLength":1,"description":"字段 rtcTokenRef（语义见对应领域契约） / Field rtcTokenRef"}},"required":["sessionId","hostRoomId","guestRoomId","status"]}
  - name: "IngestEndpointRequest"
    description: {zh: "推流端点申请请求", en: "Ingest endpoint request"}
    schema: {"type":"object","description":"推流端点申请请求 / Ingest endpoint request","additionalProperties":false,"properties":{"roomId":{"$ref":"urn:normify:bili.contract.common:Id","description":"直播间 ID / Live room id"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["roomId","idempotencyKey","requestContext"]}
  - name: "CohostRequest"
    description: {zh: "连麦会话写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定）", en: "Co-host session write request carrying only client-provided fields"}
    schema: {"type":"object","description":"连麦会话写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定） / Co-host session write request carrying only client-provided fields","additionalProperties":false,"properties":{"sessionId":{"$ref":"urn:normify:bili.contract.common:Id","description":"会话 ID / Session id"},"hostRoomId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 hostRoomId（语义见对应领域契约） / Field hostRoomId"},"guestRoomId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 guestRoomId（语义见对应领域契约） / Field guestRoomId"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["sessionId","hostRoomId","guestRoomId","idempotencyKey","requestContext"]}
deps:
  - kind: call
    to: bili.media.transcode
    label: {zh: "直播转码档位与低延迟", en: "Live transcode tiers and low"}
  - kind: call
    to: bili.infra.config
    label: {zh: "RTC 凭据引用（不落明文）", en: "RTC credential references"}
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
