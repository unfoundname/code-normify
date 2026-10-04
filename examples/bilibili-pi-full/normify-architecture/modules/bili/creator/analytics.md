---
uid: 3159340c
id: bili.creator.analytics
parent: bili.creator
state: planned
tags: [planned, "worker:W-CREATOR", leaf]
name: {zh: "数据分析", en: "Analytics"}
description:
  zh: >
      播放/互动/完播/观众画像的趋势与对比
  en: >
      Trends and comparisons for plays, interactions, completion and audience profile
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/creator/analytics/src/analytics.ts"
  - path: "services/creator/analytics/tests/analytics.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/creator/analytics"
    description:
      zh: >
          查询创作数据
      en: >
          Query creator analytics
    input: {module: "bili.creator.analytics", name: "AnalyticsQueryRequest"}
    output: {module: "bili.contract.common", name: "PageResult"}
types:
  - name: "AnalyticsQuery"
    description: {zh: "数据分析查询", en: "Analytics query"}
    schema: {"type":"object","description":"数据分析查询 / Analytics query","additionalProperties":false,"properties":{"bvid":{"type":"string","minLength":1,"description":"视频业务号（BV 号） / Video business id"},"range":{"type":"string","enum":["SEVEN_DAYS","THIRTY_DAYS","QUARTER","CUSTOM"],"description":"字段 range（语义见对应领域契约） / Field range"},"metrics":{"type":"array","items":{"type":"string","enum":["PLAY","INTERACT","REVENUE","FANS"],"description":"业务枚举，取值须覆盖该产品类型的完整取值集合"},"description":"字段 metrics（语义见对应领域契约） / Field metrics"}},"required":["range","metrics"]}
  - name: "AnalyticsQueryRequest"
    description: {zh: "数据分析查询写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定）", en: "Analytics query write request carrying only client-provided fields"}
    schema: {"type":"object","description":"数据分析查询写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定） / Analytics query write request carrying only client-provided fields","additionalProperties":false,"properties":{"bvid":{"type":"string","minLength":1,"description":"视频业务号（BV 号） / Video business id"},"range":{"type":"string","enum":["SEVEN_DAYS","THIRTY_DAYS","QUARTER","CUSTOM"],"description":"字段 range（语义见对应领域契约） / Field range"},"metrics":{"type":"array","items":{"type":"string","enum":["PLAY","INTERACT","REVENUE","FANS"],"description":"业务枚举，取值须覆盖该产品类型的完整取值集合"},"description":"字段 metrics（语义见对应领域契约） / Field metrics"}},"required":["range","metrics"]}
deps:
  - kind: call
    to: bili.discover.indexing
    label: {zh: "读取统计投影数据", en: "Read stat projections"}
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
