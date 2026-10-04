---
uid: 1f83d5cc
id: bili.identity.deletion
parent: bili.identity
state: planned
tags: [planned, "worker:W-IDENTITY", leaf]
name: {zh: "注销与数据导出", en: "Account deletion and export"}
description:
  zh: >
      注销冷却、数据导出包与合规删除范围
  en: >
      Deletion cooling-off, data export package and compliant deletion scope
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/identity/deletion/src/deletion.ts"
  - path: "services/identity/deletion/tests/deletion.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/identity/deletion-requests"
    description:
      zh: >
          提交注销
      en: >
          Request account deletion
    input: {module: "bili.identity.deletion", name: "DeletionRequest"}
    output: {module: "bili.identity.deletion", name: "DeletionRequest"}
  - protocol: http
    method: POST
    path: "/api/v1/identity/deletion-requests/cancellation"
    description:
      zh: >
          取消注销申请
      en: >
          Cancel a deletion request
    input: {module: "bili.identity.deletion", name: "CancelDeletionRequest"}
    output: {module: "bili.identity.deletion", name: "DeletionRequest"}
types:
  - name: "DeletionRequest"
    description: {zh: "注销请求", en: "Deletion request"}
    schema: {"type":"object","description":"注销请求 / Deletion request","additionalProperties":false,"properties":{"requestId":{"$ref":"urn:normify:bili.contract.common:Id","description":"请求 ID / Request id"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["requestId","idempotencyKey","requestContext"]}
  - name: "CreateDeletionRequest"
    description: {zh: "提交注销请求", en: "Create deletion request"}
    schema: {"type":"object","description":"提交注销请求 / Create deletion request","additionalProperties":false,"properties":{"reason":{"type":"string","enum":["USER_CHOICE","PRIVACY","CONTENT","OTHER"],"description":"原因或理由 / Reason"},"exportData":{"type":"boolean","description":"字段 exportData（语义见对应领域契约） / Field exportData"}},"required":["reason","exportData"]}
  - name: "CancelDeletionRequest"
    description: {zh: "取消注销请求", en: "Cancel deletion request"}
    schema: {"type":"object","description":"取消注销请求 / Cancel deletion request","additionalProperties":false,"properties":{"requestId":{"$ref":"urn:normify:bili.contract.common:Id","description":"请求 ID / Request id"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["requestId","idempotencyKey","requestContext"]}
deps:
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
