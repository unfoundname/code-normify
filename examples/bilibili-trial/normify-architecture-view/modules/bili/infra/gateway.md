---
uid: 56ccc293
id: bili.infra.gateway
parent: bili.infra
state: planned
tags: ["worker:infra-gateway"]
name: {zh: "接入网关", en: "API Gateway"}
description:
  zh: >
      Web/后台/创作端统一入口：路由、鉴权中间件、限流、请求上下文与健康检查；不含业务规则。
      
  en: >
      Single entry for web/admin/studio: routing, auth middleware, rate limit, request context, health checks.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/gateway/src/server.ts"
  - path: "services/gateway/src/middleware/auth.ts"
  - path: "services/gateway/tests/gateway.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/healthz"
    description:
      zh: >
          存活探针
          
      en: >
          Liveness probe
          
    output: {module: "bili.infra.gateway", name: "HealthReport"}
  - protocol: http
    method: GET
    path: "/readyz"
    description:
      zh: >
          就绪探针（含依赖）
          
      en: >
          Readiness probe
          
    output: {module: "bili.infra.gateway", name: "HealthReport"}
  - protocol: http
    method: POST
    path: "/api/v1/gateway/rate-limit-policies"
    description:
      zh: >
          下发/更新限流策略
          
      en: >
          Upsert rate limit policy
          
    input: {module: "bili.infra.gateway", name: "RateLimitPolicy"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
types:
  - name: "RequestContext"
    description: {zh: "请求上下文", en: "Request context"}
    schema: {"type":"object","additionalProperties":false,"properties":{"traceId":{"type":"string","description":"链路 ID"},"requestId":{"type":"string","description":"请求 ID"},"auth":{"$ref":"urn:normify:bili.contract.core.authz:AuthContext"},"clientIp":{"type":"string","description":"来源 IP"},"userAgent":{"type":"string","description":"UA"},"receivedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"channel":{"type":"string","enum":["web","admin","studio","openapi"],"description":"通道"}},"required":["traceId","requestId","channel"]}
  - name: "RateLimitPolicy"
    description: {zh: "限流策略", en: "Rate limit policy"}
    schema: {"type":"object","additionalProperties":false,"properties":{"scope":{"type":"string","enum":["ip","user","device","endpoint"],"description":"限流范围"},"windowSeconds":{"type":"integer","description":"窗口秒数","minimum":1},"maxRequests":{"type":"integer","description":"窗口内最大请求数","minimum":1},"burst":{"type":"integer","description":"突发额度","minimum":0},"onExceed":{"type":"string","enum":["reject_429","queue","degrade_readonly"],"description":"超限行为"}},"required":["scope","windowSeconds","maxRequests","onExceed"]}
  - name: "HealthReport"
    description: {zh: "健康报告", en: "Health report"}
    schema: {"type":"object","additionalProperties":false,"properties":{"service":{"type":"string","description":"服务名"},"status":{"type":"string","enum":["ok","degraded","down"],"description":"状态"},"dependencies":{"type":"array","description":"依赖状态","items":{"type":"object","additionalProperties":false,"properties":{"name":{"type":"string","description":"依赖名"},"status":{"type":"string","description":"状态"},"latencyMs":{"type":"integer","description":"耗时毫秒","minimum":0}},"required":["name","status"]}},"checkedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["service","status","checkedAt"]}
deps:
  - kind: call
    to: bili.contract.core.authz
    label: {zh: "解析令牌得到上下文", en: "Resolve token to auth context"}
  - kind: dataflow
    to: bili.infra.observability
    label: {zh: "上报访问日志与指标", en: "Emit access logs and metrics"}
---
