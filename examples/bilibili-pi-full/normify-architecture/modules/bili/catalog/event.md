---
uid: 17e3d46f
id: bili.catalog.event
parent: bili.catalog
state: planned
tags: [planned, "worker:W-CONTENT", leaf]
name: {zh: "发布事件生产", en: "Publish event production"}
description:
  zh: >
      同一事务写入 outbox，版本化事件供搜索/推荐/动态消费
  en: >
      Write versioned events into the outbox in the same transaction for search, recommendation and feed consumers
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/catalog/event/src/publish-event.ts"
  - path: "services/catalog/event/tests/publish-event.test.ts"
apis:
  - protocol: kafka
    path: "bili.catalog.video-published"
    description:
      zh: >
          发布事件（含版本与去重键）
      en: >
          Publish event with version and dedupe key
    input: {module: "bili.catalog.event", name: "VideoPublishedEvent"}
  - protocol: kafka
    path: "bili.catalog.video-removed"
    description:
      zh: >
          下架事件
      en: >
          Removal event
    input: {module: "bili.catalog.event", name: "VideoRemovedEvent"}
types:
  - name: "VideoPublishedEvent"
    description: {zh: "视频发布事件（生产/运输形态）", en: "Video published event (producer and transport form)"}
    schema: {"type":"object","description":"视频发布事件（生产/运输形态） / Video published event (producer and transport form)","additionalProperties":false,"properties":{"envelope":{"$ref":"urn:normify:bili.contract.event:EventEnvelope","description":"字段 envelope（语义见对应领域契约） / Field envelope"}},"required":["envelope"]}
  - name: "VideoRemovedEvent"
    description: {zh: "视频下架事件（生产/运输形态）", en: "Video removed event (producer and transport form)"}
    schema: {"type":"object","description":"视频下架事件（生产/运输形态） / Video removed event (producer and transport form)","additionalProperties":false,"properties":{"envelope":{"$ref":"urn:normify:bili.contract.event:EventEnvelope","description":"字段 envelope（语义见对应领域契约） / Field envelope"}},"required":["envelope"]}
  - name: "VideoPublishedPayload"
    description: {zh: "视频发布载荷", en: "Video published payload"}
    schema: {"type":"object","description":"视频发布载荷 / Video published payload","additionalProperties":false,"properties":{"bvid":{"type":"string","minLength":1,"description":"视频业务号（BV 号） / Video business id"},"uploaderId":{"$ref":"urn:normify:bili.contract.common:Id","description":"投稿用户 ID / Uploader user id"},"partitionId":{"$ref":"urn:normify:bili.contract.common:Id","description":"分区 ID / Partition id"},"tagIds":{"type":"array","items":{"$ref":"urn:normify:bili.contract.common:Id"},"description":"标签 ID 列表 / Tag id list"},"publishedAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"发布时间 / Published time"}},"required":["bvid","uploaderId","partitionId","tagIds","publishedAt"]}
  - name: "VideoRemovedPayload"
    description: {zh: "视频下架载荷", en: "Video removed payload"}
    schema: {"type":"object","description":"视频下架载荷 / Video removed payload","additionalProperties":false,"properties":{"bvid":{"type":"string","minLength":1,"description":"视频业务号（BV 号） / Video business id"},"removedBy":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 removedBy（语义见对应领域契约） / Field removedBy"},"reason":{"type":"string","minLength":1,"description":"原因或理由 / Reason"},"removedAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"字段 removedAt（语义见对应领域契约） / Field removedAt"}},"required":["bvid","removedBy","reason","removedAt"]}
  - name: "VideoPublishedConsumedEvent"
    description: {zh: "视频发布事件（消费形态）", en: "Video published event (consumer form)"}
    schema: {"type":"object","description":"视频发布事件（消费形态） / Video published event (consumer form)","additionalProperties":false,"properties":{"envelope":{"$ref":"urn:normify:bili.contract.event:EventEnvelope","description":"字段 envelope（语义见对应领域契约） / Field envelope"},"payload":{"$ref":"urn:normify:bili.catalog.event:VideoPublishedPayload","description":"事件载荷 / Event payload"}},"required":["envelope","payload"]}
  - name: "VideoRemovedConsumedEvent"
    description: {zh: "视频下架事件（消费形态）", en: "Video removed event (consumer form)"}
    schema: {"type":"object","description":"视频下架事件（消费形态） / Video removed event (consumer form)","additionalProperties":false,"properties":{"envelope":{"$ref":"urn:normify:bili.contract.event:EventEnvelope","description":"字段 envelope（语义见对应领域契约） / Field envelope"},"payload":{"$ref":"urn:normify:bili.catalog.event:VideoRemovedPayload","description":"事件载荷 / Event payload"}},"required":["envelope","payload"]}
deps:
  - kind: event
    to: bili.infra.outbox
    label: {zh: "同事务写 outbox 并保证至少一次投递", en: "Write the outbox in the same"}
  - kind: call
    to: bili.infra.db
    label: {zh: "事务读写与表所有权校验", en: "Transactional persistence and"}
  - kind: reference
    to: bili.contract.common
    label: {zh: "统一 ID/时间/分页/错误契约", en: "Unified id, time, pagination"}
---
