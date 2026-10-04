---
uid: c50c298a
id: bili.commerce.vip
parent: bili.commerce
state: planned
tags: [planned, "worker:W-COMMERCE", leaf]
name: {zh: "大会员与权益", en: "Membership and entitlements"}
description:
  zh: >
      大会员等级、权益定义与统一权益校验接口
  en: >
      Membership tiers, entitlement definitions and the unified entitlement check
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/commerce/vip/src/vip.ts"
  - path: "services/commerce/vip/src/entitlement.ts"
  - path: "services/commerce/vip/tests/vip.test.ts"
  - path: "services/commerce/vip/tests/entitlement.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/commerce/membership/"
    description:
      zh: >
          查询大会员状态
      en: >
          Get membership state
    output: {module: "bili.commerce.vip", name: "VipMembership"}
  - protocol: http
    method: POST
    path: "/api/v1/commerce/entitlements/check"
    description:
      zh: >
          权益校验（播放入口调用）
      en: >
          Entitlement check for playback
    input: {module: "bili.commerce.vip", name: "EntitlementRequest"}
    output: {module: "bili.commerce.vip", name: "EntitlementCheck"}
types:
  - name: "EntitlementCheck"
    description: {zh: "权益校验", en: "Entitlement check"}
    schema: {"type":"object","description":"权益校验 / Entitlement check","additionalProperties":false,"properties":{"userId":{"$ref":"urn:normify:bili.contract.common:Id","description":"用户 ID / User id"},"resourceType":{"$ref":"urn:normify:bili.contract.common:PlayableResourceType","description":"字段 resourceType（语义见对应领域契约） / Field resourceType"},"resourceId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 resourceId（语义见对应领域契约） / Field resourceId"},"requiredTier":{"type":"string","enum":["NONE","VIP","VIP_ANNUAL","COURSE","PREMIUM"],"description":"字段 requiredTier（语义见对应领域契约） / Field requiredTier"},"allowed":{"type":"boolean","description":"是否允许播放 / Whether playback is allowed"},"reason":{"type":"string","enum":["ACTIVE","EXPIRED","INSUFFICIENT_TIER","NOT_PURCHASED"],"description":"原因或理由 / Reason"}},"required":["userId","resourceType","resourceId","requiredTier","allowed","reason"]}
  - name: "VipMembership"
    description: {zh: "大会员状态", en: "Membership state"}
    schema: {"type":"object","description":"大会员状态 / Membership state","additionalProperties":false,"properties":{"userId":{"$ref":"urn:normify:bili.contract.common:Id","description":"用户 ID / User id"},"tier":{"type":"string","enum":["NONE","MONTHLY","ANNUAL","TV"],"description":"字段 tier（语义见对应领域契约） / Field tier"},"validFrom":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"生效时间 / Valid from"},"validTo":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"失效时间 / Valid to"},"autoRenew":{"type":"boolean","description":"字段 autoRenew（语义见对应领域契约） / Field autoRenew"}},"required":["userId","tier","validFrom","validTo","autoRenew"]}
  - name: "EntitlementRequest"
    description: {zh: "权益校验请求", en: "Entitlement check request"}
    schema: {"type":"object","description":"权益校验请求 / Entitlement check request","additionalProperties":false,"properties":{"userId":{"$ref":"urn:normify:bili.contract.common:Id","description":"用户 ID / User id"},"resourceType":{"$ref":"urn:normify:bili.contract.common:PlayableResourceType","description":"字段 resourceType（语义见对应领域契约） / Field resourceType"},"resourceId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 resourceId（语义见对应领域契约） / Field resourceId"},"requiredTier":{"type":"string","enum":["NONE","VIP","VIP_ANNUAL","COURSE","PREMIUM"],"description":"字段 requiredTier（语义见对应领域契约） / Field requiredTier"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["userId","resourceType","resourceId","idempotencyKey","requestContext"]}
  - name: "EntitlementDecision"
    description: {zh: "权益裁决", en: "Entitlement decision"}
    schema: {"type":"object","description":"权益裁决 / Entitlement decision","additionalProperties":false,"properties":{"allowed":{"type":"boolean","description":"是否允许播放 / Whether playback is allowed"},"reason":{"type":"string","enum":["ACTIVE","EXPIRED","INSUFFICIENT_TIER","NOT_PURCHASED"],"description":"原因或理由 / Reason"},"evaluatedAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"字段 evaluatedAt（语义见对应领域契约） / Field evaluatedAt"}},"required":["allowed","reason","evaluatedAt"]}
deps:
  - kind: call
    to: bili.commerce.order
    label: {zh: "按订单授予权益", en: "Grant entitlements from orders"}
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
