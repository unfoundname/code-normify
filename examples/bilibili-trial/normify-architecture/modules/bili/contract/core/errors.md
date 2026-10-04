---
uid: 9b4bd4a7
id: bili.contract.core.errors
parent: bili.contract.core
state: planned
tags: ["worker:contract-core"]
name: {zh: "错误契约", en: "Error Contract"}
description:
  zh: >
      唯一错误形态：code/message/retryable/details + traceId，前端与网关共用同一解析器。
      
  en: >
      Single error shape shared by gateway and clients.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "packages/contracts/src/core/errors.ts"
  - path: "packages/contracts/tests/errors.test.ts"
apis: []
types:
  - name: "ApiError"
    description: {zh: "唯一错误对象", en: "Single error object"}
    schema: {"type":"object","additionalProperties":false,"description":"禁止各域自定义错误体","properties":{"code":{"type":"string","description":"机器可读错误码","pattern":"^[A-Z][A-Z0-9_]{2,63}$"},"message":{"type":"string","description":"人类可读信息"},"retryable":{"type":"boolean","description":"客户端是否可重试"},"details":{"type":"array","description":"字段级明细","items":{"type":"object","additionalProperties":false,"properties":{"field":{"type":"string","description":"字段路径"},"reason":{"type":"string","description":"失败原因"}},"required":["field","reason"]}}},"required":["code","message","retryable"]}
  - name: "ErrorResponse"
    description: {zh: "错误响应包装", en: "Error response envelope"}
    schema: {"type":"object","additionalProperties":false,"properties":{"error":{"$ref":"urn:normify:bili.contract.core.errors:ApiError"},"traceId":{"type":"string","description":"链路 ID，用于日志关联"}},"required":["error","traceId"]}
---
