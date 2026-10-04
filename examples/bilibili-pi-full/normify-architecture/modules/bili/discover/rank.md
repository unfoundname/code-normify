---
uid: 8aee9723
id: bili.discover.rank
parent: bili.discover
state: planned
tags: [planned, "worker:W-DISCOVER", leaf]
name: {zh: "榜单", en: "Rankings"}
description:
  zh: >
      全站/分区/指数榜、周期计算与榜单快照
  en: >
      Global and partition rankings, periodic computation and snapshots
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/discover/rank/src/rank.ts"
  - path: "services/discover/rank/tests/rank.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/discover/rankings"
    description:
      zh: >
          查询榜单
      en: >
          Get rankings
    output: {module: "bili.contract.common", name: "PageResult"}
types:
  - name: "RankItem"
    description: {zh: "榜单条目", en: "Rank item"}
    schema: {"type":"object","description":"榜单条目 / Rank item","additionalProperties":false,"properties":{"rankType":{"type":"string","enum":["ALL","PARTITION","WEEKLY","MONTHLY","RISING"],"description":"榜单类型 / Rank type"},"position":{"type":"integer","description":"位次 / Position index"},"bvid":{"type":"string","minLength":1,"description":"视频业务号（BV 号） / Video business id"},"score":{"type":"number","description":"评分 / Rating score"},"periodStart":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"字段 periodStart（语义见对应领域契约） / Field periodStart"}},"required":["rankType","position","bvid","score","periodStart"]}
deps:
  - kind: call
    to: bili.discover.indexing
    label: {zh: "基于统计投影计算榜单", en: "Compute rankings from stat"}
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
