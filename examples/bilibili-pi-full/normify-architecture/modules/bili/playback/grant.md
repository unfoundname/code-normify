---
uid: 27d85e21
id: bili.playback.grant
parent: bili.playback
state: planned
tags: [planned, "worker:W-PLAYBACK", leaf]
name: {zh: "统一播放授权", en: "Unified playback grant"}
description:
  zh: >
      所有播放入口唯一签发点：核对可见性、版权地域与会员权益
  en: >
      The only grant issuer for every playback entry: visibility, territorial license and membership entitlement
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/playback/grant/src/grant.ts"
  - path: "services/playback/grant/tests/grant.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/playback/grants"
    description:
      zh: >
          签发播放授权
      en: >
          Issue a playback grant
    input: {module: "bili.playback.grant", name: "GrantRequest"}
    output: {module: "bili.contract.state", name: "PlaybackGrant"}
  - protocol: http
    method: POST
    path: "/api/v1/playback/grants/verification"
    description:
      zh: >
          验证既有授权是否可用于该资源
      en: >
          Verify that an existing grant may be used for a resource
    input: {module: "bili.playback.grant", name: "GrantVerifyRequest"}
    output: {module: "bili.contract.state", name: "PlaybackGrant"}
types:
  - name: "GrantRequest"
    description: {zh: "播放授权请求", en: "Grant request"}
    schema: {"type":"object","description":"播放授权请求 / Grant request","additionalProperties":false,"properties":{"resourceType":{"$ref":"urn:normify:bili.contract.common:PlayableResourceType","description":"字段 resourceType（语义见对应领域契约） / Field resourceType"},"resourceId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 resourceId（语义见对应领域契约） / Field resourceId"},"userId":{"$ref":"urn:normify:bili.contract.common:Id","description":"用户 ID / User id"},"qualityId":{"$ref":"urn:normify:bili.contract.common:Id","description":"清晰度档位 ID / Quality tier id"},"region":{"type":"string","minLength":1,"description":"地域代码 / Region code"},"platformCode":{"type":"string","minLength":1,"description":"平台代码 / Platform code"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["resourceType","resourceId","region","platformCode","idempotencyKey","requestContext"]}
  - name: "GrantVerifyRequest"
    description: {zh: "授权验证请求", en: "Grant verification request"}
    schema: {"type":"object","description":"授权验证请求 / Grant verification request","additionalProperties":false,"properties":{"grantId":{"$ref":"urn:normify:bili.contract.common:Id","description":"播放授权 ID / Playback grant id"},"resourceType":{"$ref":"urn:normify:bili.contract.common:PlayableResourceType","description":"字段 resourceType（语义见对应领域契约） / Field resourceType"},"resourceId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 resourceId（语义见对应领域契约） / Field resourceId"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["grantId","resourceType","resourceId","idempotencyKey","requestContext"]}
deps:
  - kind: call
    to: bili.catalog.video
    from_api: "POST /api/v1/playback/grants"
    to_api: "GET /api/v1/catalog/videos/:bvid"
    label: {zh: "核对发布状态与可见性", en: "Check publish state and"}
  - kind: call
    to: bili.pgc.license
    from_api: "POST /api/v1/playback/grants"
    to_api: "GET /api/v1/pgc/licenses/by-resource/:resourceId"
    label: {zh: "核对版权地域与期限", en: "Check territorial license and"}
  - kind: call
    to: bili.commerce.vip
    from_api: "POST /api/v1/playback/grants"
    to_api: "POST /api/v1/commerce/entitlements/check"
    label: {zh: "核对会员权益", en: "Check membership entitlement"}
  - kind: call
    to: bili.identity.privacy
    label: {zh: "黑名单与隐私可见性", en: "Blocklist and privacy"}
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
