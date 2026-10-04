---
uid: d526b6df
id: bili.client.web.shared.data
parent: bili.client.web.shared
state: planned
tags: ["worker:web-shell"]
name: {zh: "请求与数据访问", en: "Data Access Layer"}
description:
  zh: >
      统一请求客户端：分页、错误、幂等键注入、重试与查询缓存，是前端唯一出口。
      
  en: >
      Single fetch client: paging, errors, idempotency key injection, retry and query cache.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/web/src/shared/data/client.ts"
  - path: "apps/web/src/shared/data/query.ts"
  - path: "apps/web/tests/data.test.ts"
apis: []
types:
  - name: "ApiClientConfig"
    description: {zh: "请求客户端配置", en: "API client config"}
    schema: {"type":"object","additionalProperties":false,"properties":{"baseUrl":{"type":"string","description":"基地址"},"timeoutMs":{"type":"integer","description":"超时毫秒","minimum":100},"retry":{"type":"integer","description":"读请求重试次数","minimum":0,"maximum":3},"errorParser":{"type":"string","description":"错误解析器"},"idempotencyHeader":{"type":"string","description":"幂等键请求头名"}},"required":["baseUrl","timeoutMs"]}
  - name: "RequestState"
    description: {zh: "请求状态", en: "Request state"}
    schema: {"type":"object","additionalProperties":false,"properties":{"status":{"type":"string","enum":["idle","loading","success","error"],"description":"状态"},"error":{"$ref":"urn:normify:bili.contract.core.errors:ApiError"},"retryable":{"type":"boolean","description":"是否可重试"},"updatedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["status"]}
---
