---
uid: e423d360
id: bili.infra.gateway
parent: bili.infra
state: planned
tags: [planned, "worker:W-INFRA", leaf]
name: {zh: "Web 接入与网关", en: "Web ingress and gateway"}
description:
  zh: >
      路由前缀、鉴权中间件、限流、请求上下文与错误映射
  en: >
      Route prefixes, auth middleware, rate limits, request context and error mapping
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/platform/gateway/src/gateway.ts"
  - path: "services/platform/gateway/tests/gateway.test.ts"
apis:
  - protocol: http
    method: ANY
    path: "/api/v1/*"
    description:
      zh: >
          统一 API 入口（鉴权/限流/上下文注入）
      en: >
          Unified API entry with auth, rate limit and context
types:
  - name: "GatewayContext"
    description: {zh: "网关上下文", en: "Gateway context"}
    schema: {"type":"object","description":"网关上下文 / Gateway context","additionalProperties":false,"properties":{"requestId":{"type":"string","minLength":1,"description":"请求 ID / Request id"},"userId":{"$ref":"urn:normify:bili.contract.common:Id","description":"用户 ID / User id"},"route":{"type":"string","minLength":1,"description":"字段 route（语义见对应领域契约） / Field route"},"rateLimitRemaining":{"type":"integer","description":"字段 rateLimitRemaining（语义见对应领域契约） / Field rateLimitRemaining"}},"required":["requestId","route","rateLimitRemaining"]}
deps:
  - kind: call
    to: bili.identity.rbac
    label: {zh: "鉴权与权限码校验", en: "Authorization and permission"}
  - kind: call
    to: bili.contract.common
    label: {zh: "统一错误映射", en: "Unified error mapping"}
---
