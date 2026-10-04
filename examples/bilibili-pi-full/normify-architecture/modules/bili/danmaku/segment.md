---
uid: 486ba7d0
id: bili.danmaku.segment
parent: bili.danmaku
state: planned
tags: [planned, "worker:W-DANMAKU", leaf]
name: {zh: "弹幕分段", en: "Danmaku segments"}
description:
  zh: >
      按时间段分片存储与获取、分片版本与合并
  en: >
      Segment-based storage and fetch, segment versioning and merging
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/danmaku/segment/src/segment.ts"
  - path: "services/danmaku/segment/tests/segment.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/danmaku/videos/:bvid/segments"
    description:
      zh: >
          按稿件与时间段获取弹幕（bvid + startMs + endMs 显式定位）
      en: >
          Fetch danmaku segments by video and time window
    input: {module: "bili.danmaku.segment", name: "DanmakuSegmentQueryRequest"}
    output: {module: "bili.danmaku.segment", name: "DanmakuSegment"}
types:
  - name: "DanmakuSegment"
    description: {zh: "弹幕分片", en: "Danmaku segment"}
    schema: {"type":"object","description":"弹幕分片 / Danmaku segment","additionalProperties":false,"properties":{"bvid":{"type":"string","minLength":1,"description":"视频业务号（BV 号） / Video business id"},"startMs":{"type":"integer","description":"字段 startMs（语义见对应领域契约） / Field startMs"},"endMs":{"type":"integer","description":"字段 endMs（语义见对应领域契约） / Field endMs"},"version":{"type":"integer","description":"字段 version（语义见对应领域契约） / Field version"},"items":{"type":"array","items":{"$ref":"urn:normify:bili.danmaku.segment:DanmakuItem"},"description":"结果列表 / Result items"}},"required":["bvid","startMs","endMs","version","items"]}
  - name: "DanmakuItem"
    description: {zh: "弹幕条目", en: "Danmaku item"}
    schema: {"type":"object","description":"弹幕条目 / Danmaku item","additionalProperties":false,"properties":{"danmakuId":{"$ref":"urn:normify:bili.contract.common:Id","description":"弹幕 ID / Danmaku id"},"positionMs":{"type":"integer","description":"时间点（毫秒） / Position in ms"},"text":{"type":"string","minLength":1,"description":"文本内容 / Text"},"mode":{"type":"string","enum":["SCROLL","TOP","BOTTOM","REVERSE"],"description":"字段 mode（语义见对应领域契约） / Field mode"},"color":{"type":"integer","description":"字段 color（语义见对应领域契约） / Field color"},"fontSize":{"type":"integer","description":"字段 fontSize（语义见对应领域契约） / Field fontSize"},"senderId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 senderId（语义见对应领域契约） / Field senderId"},"createdAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"创建时间 / Created time"}},"required":["danmakuId","positionMs","text","mode","color","fontSize","senderId","createdAt"]}
  - name: "DanmakuSegmentQueryRequest"
    description: {zh: "弹幕分段查询请求", en: "Danmaku segment query request"}
    schema: {"type":"object","description":"弹幕分段查询请求 / Danmaku segment query request","additionalProperties":false,"properties":{"bvid":{"type":"string","minLength":1,"description":"视频业务号（BV 号） / Video business id"},"startMs":{"type":"integer","description":"字段 startMs（语义见对应领域契约） / Field startMs"},"endMs":{"type":"integer","description":"字段 endMs（语义见对应领域契约） / Field endMs"}},"required":["bvid","startMs","endMs"]}
deps:
  - kind: call
    to: bili.catalog.video
    label: {zh: "校验稿件可见性", en: "Check video visibility"}
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
