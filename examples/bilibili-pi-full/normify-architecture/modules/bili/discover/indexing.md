---
uid: 0586a5d5
id: bili.discover.indexing
parent: bili.discover
state: planned
tags: [planned, "worker:W-DISCOVER", leaf]
name: {zh: "搜索索引投影", en: "Search index projection"}
description:
  zh: >
      消费发布事件构建搜索文档、字段映射与重建
  en: >
      Consume publish events to build search documents, field mappings and rebuilds
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/discover/indexing/src/index-projection.ts"
  - path: "services/discover/indexing/tests/index-projection.test.ts"
apis:
  - protocol: kafka
    path: "bili.discover.video-index"
    description:
      zh: >
          消费发布事件写入索引
      en: >
          Consume publish events into the index
    input: {module: "bili.discover.indexing", name: "VideoSearchDocument"}
  - protocol: kafka
    path: "consume.bili.catalog.video-published"
    description:
      zh: >
          消费发布事件建立/更新检索文档
      en: >
          Consume publish events to upsert search documents
    input: {module: "bili.catalog.event", name: "VideoPublishedConsumedEvent"}
  - protocol: kafka
    path: "consume.bili.catalog.video-removed"
    description:
      zh: >
          消费下架事件删除检索文档
      en: >
          Consume removal events to delete search documents
    input: {module: "bili.catalog.event", name: "VideoRemovedConsumedEvent"}
types:
  - name: "VideoSearchDocument"
    description: {zh: "检索文档", en: "Search document"}
    schema: {"type":"object","description":"检索文档 / Search document","additionalProperties":false,"properties":{"bvid":{"type":"string","minLength":1,"description":"视频业务号（BV 号） / Video business id"},"title":{"type":"string","minLength":1,"description":"标题 / Title"},"tagNames":{"type":"array","items":{"type":"string","minLength":1},"description":"字段 tagNames（语义见对应领域契约） / Field tagNames"},"uploaderMid":{"type":"string","minLength":1,"description":"字段 uploaderMid（语义见对应领域契约） / Field uploaderMid"},"partitionId":{"$ref":"urn:normify:bili.contract.common:Id","description":"分区 ID / Partition id"},"durationMs":{"type":"integer","description":"时长（毫秒） / Duration in ms"},"score":{"type":"number","description":"评分 / Rating score"},"auditState":{"$ref":"urn:normify:bili.contract.state:AuditState","description":"审核状态 / Audit state"}},"required":["bvid","title","tagNames","uploaderMid","partitionId","durationMs","score","auditState"]}
  - name: "VideoIndexEvent"
    description: {zh: "视频索引事件", en: "Video index event"}
    schema: {"type":"object","description":"视频索引事件 / Video index event","additionalProperties":false,"properties":{"envelope":{"$ref":"urn:normify:bili.contract.event:EventEnvelope","description":"字段 envelope（语义见对应领域契约） / Field envelope"},"bvid":{"type":"string","minLength":1,"description":"视频业务号（BV 号） / Video business id"},"indexAction":{"type":"string","enum":["UPSERT","DELETE"],"description":"字段 indexAction（语义见对应领域契约） / Field indexAction"},"reason":{"type":"string","minLength":1,"description":"原因或理由 / Reason"}},"required":["envelope","bvid","indexAction","reason"]}
deps:
  - kind: event
    to: bili.catalog.event
    from_api: "kafka:consume.bili.catalog.video-published"
    to_api: "kafka:bili.catalog.video-published"
    label: {zh: "发布/下架事件驱动索引变更", en: "Publish and removal events"}
  - kind: call
    to: bili.infra.search
    from_api: "kafka:bili.discover.video-index"
    to_api: "rpc:search.index.upsert"
    label: {zh: "写入搜索服务", en: "Write into the search service"}
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
