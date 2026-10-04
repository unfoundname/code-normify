---
uid: 87c9268b
id: bili.upload.collection
parent: bili.upload
state: planned
tags: [planned, "worker:W-CONTENT", leaf]
name: {zh: "合集与系列", en: "Collections and seasons"}
description:
  zh: >
      视频合集、系列归属、排序与合集封面
  en: >
      Video collections, season membership, ordering and covers
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/upload/collection/src/collection.ts"
  - path: "services/upload/collection/tests/collection.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/upload/collections"
    description:
      zh: >
          创建合集
      en: >
          Create a collection
    input: {module: "bili.upload.collection", name: "CollectionRequest"}
    output: {module: "bili.upload.collection", name: "CollectionView"}
  - protocol: http
    method: PUT
    path: "/api/v1/upload/collections/"
    description:
      zh: >
          编辑合集与顺序
      en: >
          Edit a collection
    input: {module: "bili.upload.collection", name: "CollectionRequest"}
    output: {module: "bili.upload.collection", name: "CollectionView"}
types:
  - name: "CollectionView"
    description: {zh: "合集视图", en: "Collection view"}
    schema: {"type":"object","description":"合集视图 / Collection view","additionalProperties":false,"properties":{"collectionId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 collectionId（语义见对应领域契约） / Field collectionId"},"ownerId":{"$ref":"urn:normify:bili.contract.common:Id","description":"所有者用户 ID / Owner user id"},"title":{"type":"string","minLength":1,"description":"标题 / Title"},"bvidList":{"type":"array","items":{"type":"string","minLength":1},"description":"字段 bvidList（语义见对应领域契约） / Field bvidList"},"updatedAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"更新时间 / Updated time"}},"required":["collectionId","ownerId","title","bvidList","updatedAt"]}
  - name: "CollectionRequest"
    description: {zh: "合集视图写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定）", en: "Collection view write request carrying only client-provided fields"}
    schema: {"type":"object","description":"合集视图写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定） / Collection view write request carrying only client-provided fields","additionalProperties":false,"properties":{"collectionId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 collectionId（语义见对应领域契约） / Field collectionId"},"title":{"type":"string","minLength":1,"description":"标题 / Title"},"bvidList":{"type":"array","items":{"type":"string","minLength":1},"description":"字段 bvidList（语义见对应领域契约） / Field bvidList"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["collectionId","title","bvidList","idempotencyKey","requestContext"]}
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
