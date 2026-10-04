---
uid: ed47dd78
id: bili.client.shared.http
parent: bili.client.shared
state: planned
tags: [planned, "worker:W-CONTRACT", leaf]
name: {zh: "请求层与错误处理", en: "Request layer and error handling"}
description:
  zh: >
      统一 fetch 封装、幂等键、错误形态解析、重试与取消
  en: >
      Unified fetch wrapper, idempotency keys, error parsing, retry and cancellation
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/web/src/shared/http/client.ts"
  - path: "apps/web/tests/shared/http/client.test.ts"
apis:
  - protocol: file
    path: "apps/web/src/shared/http/client.ts"
    description:
      zh: >
          请求层入口
      en: >
          Request layer entry
types:
  - name: "HttpClientConfig"
    description: {zh: "请求层配置", en: "Http client config"}
    schema: {"type":"object","description":"请求层配置 / Http client config","additionalProperties":false,"properties":{"baseUrl":{"type":"string","minLength":1,"format":"uri","description":"字段 baseUrl（语义见对应领域契约） / Field baseUrl"},"timeoutMs":{"type":"integer","description":"字段 timeoutMs（语义见对应领域契约） / Field timeoutMs"},"locale":{"type":"string","minLength":1,"description":"字段 locale（语义见对应领域契约） / Field locale"},"credentials":{"type":"string","enum":["omit","include"],"description":"字段 credentials（语义见对应领域契约） / Field credentials"},"retryOnNetworkError":{"type":"boolean","description":"字段 retryOnNetworkError（语义见对应领域契约） / Field retryOnNetworkError"}},"required":["baseUrl","timeoutMs","locale","credentials","retryOnNetworkError"]}
---
