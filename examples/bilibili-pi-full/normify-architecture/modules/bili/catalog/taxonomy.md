---
uid: 33ae08f4
id: bili.catalog.taxonomy
parent: bili.catalog
state: planned
tags: [planned, "worker:W-CONTENT", leaf]
name: {zh: "分区与标签", en: "Partitions and tags"}
description:
  zh: >
      分区树、标签库、审核标签与目录归属
  en: >
      Partition tree, tag library, moderation tags and catalog membership
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/catalog/taxonomy/src/taxonomy.ts"
  - path: "services/catalog/taxonomy/tests/taxonomy.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/catalog/partitions/"
    description:
      zh: >
          查询分区树
      en: >
          Get the partition tree
    output: {module: "bili.catalog.taxonomy", name: "PartitionView"}
  - protocol: http
    method: GET
    path: "/api/v1/catalog/tags/"
    description:
      zh: >
          标签检索
      en: >
          Search tags
    output: {module: "bili.catalog.taxonomy", name: "TagPage"}
types:
  - name: "PartitionView"
    description: {zh: "分区视图", en: "Partition view"}
    schema: {"type":"object","description":"分区视图 / Partition view","additionalProperties":false,"properties":{"partitionId":{"$ref":"urn:normify:bili.contract.common:Id","description":"分区 ID / Partition id"},"parentId":{"$ref":"urn:normify:bili.contract.common:Id","description":"父级 ID / Parent id"},"name":{"type":"string","minLength":1,"description":"字段 name（语义见对应领域契约） / Field name"},"orderIndex":{"type":"integer","description":"字段 orderIndex（语义见对应领域契约） / Field orderIndex"},"allowedContentTypes":{"type":"string","enum":["VIDEO","ARTICLE","AUDIO","LIVE","COURSE"],"description":"字段 allowedContentTypes（语义见对应领域契约） / Field allowedContentTypes"}},"required":["partitionId","name","orderIndex","allowedContentTypes"]}
  - name: "TagView"
    description: {zh: "标签视图", en: "Tag view"}
    schema: {"type":"object","description":"标签视图 / Tag view","additionalProperties":false,"properties":{"tagId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 tagId（语义见对应领域契约） / Field tagId"},"name":{"type":"string","minLength":1,"description":"字段 name（语义见对应领域契约） / Field name"},"kind":{"type":"string","enum":["TOPIC","SYSTEM","ACTIVITY","OFFICIAL"],"description":"字段 kind（语义见对应领域契约） / Field kind"},"auditRequired":{"type":"boolean","description":"字段 auditRequired（语义见对应领域契约） / Field auditRequired"}},"required":["tagId","name","kind","auditRequired"]}
  - name: "TagPage"
    description: {zh: "领域分页响应", en: "Domain page response"}
    schema: {"type":"object","additionalProperties":false,"description":"领域分页响应 / Domain page response｜与 PageResult 完全相同的分页封套字段（items/total/nextCursor/hasMore），items 使用该领域具名条目契约 / Same envelope fields as PageResult with domain-specific typed items","properties":{"items":{"type":"array","items":{"$ref":"urn:normify:bili.catalog.taxonomy:TagView"},"description":"领域条目列表 / Domain item list"},"total":{"type":"integer","minimum":0,"description":"总条数 / Total count"},"nextCursor":{"type":"string","description":"下一页游标 / Next page cursor"},"hasMore":{"type":"boolean","description":"是否还有下一页 / Whether more pages exist"}},"required":["items","hasMore"]}
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
