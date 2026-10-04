---
uid: "33745729"
id: bili.contract.core.idempotency
parent: bili.contract.core
state: planned
tags: ["worker:contract-core"]
name: {zh: "幂等契约", en: "Idempotency Contract"}
description:
  zh: >
      写操作必须携带幂等键，返回本次是否真正生效与资源版本，供重试与乐观并发使用。
      
  en: >
      Idempotency key plus applied/version result for every write.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "packages/contracts/src/core/idempotency.ts"
  - path: "packages/contracts/tests/idempotency.test.ts"
apis: []
types:
  - name: "IdempotencyKey"
    description: {zh: "写操作幂等键", en: "Idempotency key"}
    schema: {"type":"string","description":"客户端生成，服务端以唯一约束落库","minLength":16,"maxLength":64}
  - name: "MutationResult"
    description: {zh: "幂等写结果", en: "Idempotent write result"}
    schema: {"type":"object","additionalProperties":false,"properties":{"applied":{"type":"boolean","description":"本次是否实际生效（重放为 false）"},"resourceId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"version":{"type":"integer","description":"资源版本号，用于乐观锁","minimum":1}},"required":["applied","resourceId","version"]}
---
