---
uid: 5627135f
id: bili.acquire.import
parent: bili.acquire
state: planned
tags: [planned, "worker:W-ACQUIRE", leaf]
name: {zh: "导入投稿主链", en: "Import into the publishing chain"}
description:
  zh: >
      把已获取且许可合格的内容导入投稿草稿与媒体管道
  en: >
      Import acquired, license-cleared content into drafts and the media pipeline
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/acquire/import/src/import.ts"
  - path: "services/acquire/import/tests/import.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/acquire/imports"
    description:
      zh: >
          导入为草稿（复用投稿与媒体主链）
      en: >
          Import as a draft reusing the publishing and media chains
    input: {module: "bili.acquire.import", name: "ImportRequest"}
types:
  - name: "ImportRequest"
    description: {zh: "导入请求", en: "Import request"}
    schema: {"type":"object","description":"导入请求 / Import request","additionalProperties":false,"properties":{"assetId":{"$ref":"urn:normify:bili.contract.common:Id","description":"媒体资源 ID / Media asset id"},"provenanceId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 provenanceId（语义见对应领域契约） / Field provenanceId"},"partitionId":{"$ref":"urn:normify:bili.contract.common:Id","description":"分区 ID / Partition id"},"title":{"type":"string","minLength":1,"description":"标题 / Title"},"tagIds":{"type":"array","items":{"$ref":"urn:normify:bili.contract.common:Id"},"description":"标签 ID 列表 / Tag id list"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["assetId","provenanceId","partitionId","title","tagIds","idempotencyKey","requestContext"]}
deps:
  - kind: call
    to: bili.upload.draft
    label: {zh: "创建草稿", en: "Create a draft"}
  - kind: call
    to: bili.catalog.video
    label: {zh: "经唯一发布命令发布", en: "Publish via the sole publish"}
  - kind: call
    to: bili.acquire.provenance
    label: {zh: "写入溯源归属", en: "Write provenance"}
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
