---
uid: "54519253"
id: bili.upload.lifecycle
parent: bili.upload
state: planned
tags: [planned, "worker:W-CONTENT", leaf]
name: {zh: "稿件编辑与下架", en: "Draft lifecycle and removal"}
description:
  zh: >
      已发布稿件的编辑、隐私切换、下架与删除
  en: >
      Editing published videos, privacy switching, removal and deletion
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/upload/lifecycle/src/lifecycle.ts"
  - path: "services/upload/lifecycle/tests/lifecycle.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/upload/removals"
    description:
      zh: >
          申请下架稿件
      en: >
          Request video removal
    input: {module: "bili.upload.lifecycle", name: "RemovalRequest"}
  - protocol: http
    method: PATCH
    path: "/api/v1/upload/visibility"
    description:
      zh: >
          切换可见性
      en: >
          Switch visibility
    input: {module: "bili.upload.lifecycle", name: "ChangeVisibilityRequest"}
types:
  - name: "RemovalRequest"
    description: {zh: "下架请求", en: "Removal request"}
    schema: {"type":"object","description":"下架请求 / Removal request","additionalProperties":false,"properties":{"draftId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 draftId（语义见对应领域契约） / Field draftId"},"reason":{"type":"string","enum":["COPYRIGHT","VIOLATION","SELF","DELETE"],"description":"原因或理由 / Reason"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["draftId","reason","idempotencyKey","requestContext"]}
  - name: "ChangeVisibilityRequest"
    description: {zh: "切换可见性请求", en: "Change visibility request"}
    schema: {"type":"object","description":"切换可见性请求 / Change visibility request","additionalProperties":false,"properties":{"draftId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 draftId（语义见对应领域契约） / Field draftId"},"visibility":{"$ref":"urn:normify:bili.contract.common:Visibility","description":"可见性 / Visibility"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["draftId","visibility","idempotencyKey","requestContext"]}
deps:
  - kind: call
    to: bili.catalog.state
    label: {zh: "请求发布状态机迁移", en: "Request a publish state"}
  - kind: call
    to: bili.ops.audit
    label: {zh: "下架与申诉联动", en: "Link removal with audit and"}
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
