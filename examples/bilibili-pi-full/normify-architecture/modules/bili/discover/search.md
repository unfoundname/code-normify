---
uid: a33e6d25
id: bili.discover.search
parent: bili.discover
state: planned
tags: [planned, "worker:W-DISCOVER", leaf]
name: {zh: "多类型检索", en: "Multi-type search"}
description:
  zh: >
      视频/UP 主/直播/番剧/专栏检索、筛选与排序
  en: >
      Search across video, user, live, anime and article with filters and sorting
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/discover/search/src/search.ts"
  - path: "services/discover/search/tests/search.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/discover/search"
    description:
      zh: >
          多类型检索
      en: >
          Search across resource types
    input: {module: "bili.discover.search", name: "SearchRequest"}
    output: {module: "bili.discover.search", name: "SearchResultPage"}
types:
  - name: "SearchRequest"
    description: {zh: "检索请求", en: "Search request"}
    schema: {"type":"object","description":"检索请求 / Search request","additionalProperties":false,"properties":{"query":{"type":"string","minLength":1,"description":"检索词 / Search query"},"types":{"type":"string","enum":["VIDEO","USER","LIVE","ANIME","ARTICLE","AUDIO"],"description":"字段 types（语义见对应领域契约） / Field types"},"page":{"$ref":"urn:normify:bili.contract.common:PageRequest","description":"字段 page（语义见对应领域契约） / Field page"},"filters":{"$ref":"urn:normify:bili.discover.search:SearchFilters","description":"字段 filters（语义见对应领域契约） / Field filters"}},"required":["query","types","page"]}
  - name: "SearchFilters"
    description: {zh: "检索过滤条件", en: "Search filters"}
    schema: {"type":"object","description":"检索过滤条件 / Search filters","additionalProperties":false,"properties":{"partitionIds":{"type":"array","items":{"$ref":"urn:normify:bili.contract.common:Id"},"description":"字段 partitionIds（语义见对应领域契约） / Field partitionIds"},"durationRange":{"type":"string","enum":["SHORT","MEDIUM","LONG"],"description":"字段 durationRange（语义见对应领域契约） / Field durationRange"},"orderBy":{"type":"string","enum":["RELEVANCE","PUBDATE","PLAY","DANMAKU"],"description":"字段 orderBy（语义见对应领域契约） / Field orderBy"}},"required":["durationRange","orderBy"]}
  - name: "SearchResultItem"
    description: {zh: "检索结果条目", en: "Search result item"}
    schema: {"type":"object","description":"检索结果条目 / Search result item","additionalProperties":false,"properties":{"resourceId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 resourceId（语义见对应领域契约） / Field resourceId"},"resourceType":{"type":"string","minLength":1,"description":"字段 resourceType（语义见对应领域契约） / Field resourceType"},"title":{"type":"string","minLength":1,"description":"标题 / Title"},"coverUrl":{"type":"string","minLength":1,"format":"uri","description":"封面地址 / Cover url"},"highlight":{"type":"string","minLength":1,"description":"字段 highlight（语义见对应领域契约） / Field highlight"},"score":{"type":"number","description":"评分 / Rating score"}},"required":["resourceId","resourceType","title","score"]}
  - name: "SearchResultPage"
    description: {zh: "领域分页响应", en: "Domain page response"}
    schema: {"type":"object","additionalProperties":false,"description":"领域分页响应 / Domain page response｜与 PageResult 完全相同的分页封套字段（items/total/nextCursor/hasMore），items 使用该领域具名条目契约 / Same envelope fields as PageResult with domain-specific typed items","properties":{"items":{"type":"array","items":{"$ref":"urn:normify:bili.discover.search:SearchResultItem"},"description":"领域条目列表 / Domain item list"},"total":{"type":"integer","minimum":0,"description":"总条数 / Total count"},"nextCursor":{"type":"string","description":"下一页游标 / Next page cursor"},"hasMore":{"type":"boolean","description":"是否还有下一页 / Whether more pages exist"}},"required":["items","hasMore"]}
deps:
  - kind: call
    to: bili.infra.search
    label: {zh: "检索服务适配", en: "Search service adapter"}
  - kind: call
    to: bili.ops.audit
    label: {zh: "审核未通过内容不进入检索", en: "Exclude unaudited content from"}
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
