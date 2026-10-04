---
uid: "23e26985"
id: bili.ops.penalty
parent: bili.ops
state: planned
tags: [planned, "worker:W-OPS", leaf]
name: {zh: "处罚", en: "Penalties"}
description:
  zh: >
      处罚类型、期限、执行与解除，联动内容可见性
  en: >
      Penalty types, terms, enforcement and revocation linked to content visibility
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/ops/penalty/src/penalty.ts"
  - path: "services/ops/penalty/tests/penalty.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/ops/penalties"
    description:
      zh: >
          执行处罚
      en: >
          Apply a penalty
    input: {module: "bili.ops.penalty", name: "PenaltyRequest"}
    output: {module: "bili.ops.penalty", name: "PenaltyRecord"}
  - protocol: http
    method: DELETE
    path: "/api/v1/ops/penalties/"
    description:
      zh: >
          解除处罚
      en: >
          Revoke a penalty
    input: {module: "bili.ops.penalty", name: "RevokePenaltyRequest"}
types:
  - name: "PenaltyRecord"
    description: {zh: "处罚记录", en: "Penalty record"}
    schema: {"type":"object","description":"处罚记录 / Penalty record","additionalProperties":false,"properties":{"penaltyId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 penaltyId（语义见对应领域契约） / Field penaltyId"},"subjectId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 subjectId（语义见对应领域契约） / Field subjectId"},"subjectType":{"type":"string","enum":["USER","CONTENT"],"description":"字段 subjectType（语义见对应领域契约） / Field subjectType"},"penaltyType":{"type":"string","enum":["WARNING","MUTE","BAN_CONTENT","BAN_ACCOUNT","FEATURE_BLOCK"],"description":"处罚类型 / Penalty type"},"effectiveFrom":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"字段 effectiveFrom（语义见对应领域契约） / Field effectiveFrom"},"effectiveTo":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"字段 effectiveTo（语义见对应领域契约） / Field effectiveTo"},"reason":{"type":"string","minLength":1,"description":"原因或理由 / Reason"}},"required":["penaltyId","subjectId","subjectType","penaltyType","effectiveFrom","reason"]}
  - name: "RevokePenaltyRequest"
    description: {zh: "解除处罚请求", en: "Revoke penalty request"}
    schema: {"type":"object","description":"解除处罚请求 / Revoke penalty request","additionalProperties":false,"properties":{"penaltyId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 penaltyId（语义见对应领域契约） / Field penaltyId"},"reason":{"type":"string","minLength":1,"description":"原因或理由 / Reason"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["penaltyId","reason","idempotencyKey","requestContext"]}
  - name: "PenaltyRequest"
    description: {zh: "处罚记录写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定）", en: "Penalty record write request carrying only client-provided fields"}
    schema: {"type":"object","description":"处罚记录写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定） / Penalty record write request carrying only client-provided fields","additionalProperties":false,"properties":{"penaltyId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 penaltyId（语义见对应领域契约） / Field penaltyId"},"subjectId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 subjectId（语义见对应领域契约） / Field subjectId"},"subjectType":{"type":"string","enum":["USER","CONTENT"],"description":"字段 subjectType（语义见对应领域契约） / Field subjectType"},"penaltyType":{"type":"string","enum":["WARNING","MUTE","BAN_CONTENT","BAN_ACCOUNT","FEATURE_BLOCK"],"description":"处罚类型 / Penalty type"},"effectiveFrom":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"字段 effectiveFrom（语义见对应领域契约） / Field effectiveFrom"},"effectiveTo":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"字段 effectiveTo（语义见对应领域契约） / Field effectiveTo"},"reason":{"type":"string","minLength":1,"description":"原因或理由 / Reason"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["penaltyId","subjectId","subjectType","penaltyType","effectiveFrom","reason","idempotencyKey","requestContext"]}
deps:
  - kind: call
    to: bili.identity.security
    label: {zh: "账号封禁执行", en: "Account ban enforcement"}
  - kind: call
    to: bili.catalog.state
    label: {zh: "内容处罚影响可见性", en: "Content penalties affect"}
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
