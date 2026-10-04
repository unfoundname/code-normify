---
uid: d2bb0b06
id: bili.discover.timeline
parent: bili.discover
state: planned
tags: [planned, "worker:W-DISCOVER", leaf]
name: {zh: "时间线与热度", en: "Timeline and trending"}
description:
  zh: >
      按时间/热度聚合公共内容流与趋势词
  en: >
      Time or heat based public streams and trending terms
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/discover/timeline/src/timeline.ts"
  - path: "services/discover/timeline/tests/timeline.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/discover/timeline"
    description:
      zh: >
          公共时间线与趋势
      en: >
          Public timeline and trending
    input: {module: "bili.discover.timeline", name: "TimelineQuery"}
    output: {module: "bili.discover.timeline", name: "TimelinePage"}
types:
  - name: "TimelineQuery"
    description: {zh: "时间线查询", en: "Timeline query"}
    schema: {"type":"object","description":"时间线查询 / Timeline query","additionalProperties":false,"properties":{"scene":{"type":"string","enum":["POPULAR","TRENDING","FOLLOWING"],"description":"字段 scene（语义见对应领域契约） / Field scene"},"window":{"type":"string","enum":["HOUR","DAY","WEEK"],"description":"字段 window（语义见对应领域契约） / Field window"},"page":{"$ref":"urn:normify:bili.contract.common:PageRequest","description":"字段 page（语义见对应领域契约） / Field page"}},"required":["scene","window","page"]}
  - name: "TimelinePage"
    description: {zh: "领域分页响应", en: "Domain page response"}
    schema: {"type":"object","additionalProperties":false,"description":"领域分页响应 / Domain page response｜与 PageResult 完全相同的分页封套字段（items/total/nextCursor/hasMore），items 使用该领域具名条目契约 / Same envelope fields as PageResult with domain-specific typed items","properties":{"items":{"type":"array","items":{"$ref":"urn:normify:bili.catalog.query:VideoCard"},"description":"领域条目列表 / Domain item list"},"total":{"type":"integer","minimum":0,"description":"总条数 / Total count"},"nextCursor":{"type":"string","description":"下一页游标 / Next page cursor"},"hasMore":{"type":"boolean","description":"是否还有下一页 / Whether more pages exist"}},"required":["items","hasMore"]}
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
