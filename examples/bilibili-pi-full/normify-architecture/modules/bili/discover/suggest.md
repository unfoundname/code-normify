---
uid: ae19d06f
id: bili.discover.suggest
parent: bili.discover
state: planned
tags: [planned, "worker:W-DISCOVER", leaf]
name: {zh: "搜索建议", en: "Search suggestions"}
description:
  zh: >
      联想词、热搜、历史与去重补全
  en: >
      Query completion, hot queries, history and dedupe
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/discover/suggest/src/suggest.ts"
  - path: "services/discover/suggest/tests/suggest.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/discover/suggestions"
    description:
      zh: >
          联想与热搜
      en: >
          Suggestions and hot queries
    input: {module: "bili.discover.suggest", name: "SuggestRequest"}
    output: {module: "bili.discover.suggest", name: "SuggestPage"}
types:
  - name: "SuggestRequest"
    description: {zh: "建议请求", en: "Suggest request"}
    schema: {"type":"object","description":"建议请求 / Suggest request","additionalProperties":false,"properties":{"prefix":{"type":"string","minLength":1,"description":"字段 prefix（语义见对应领域契约） / Field prefix"},"limit":{"type":"integer","description":"字段 limit（语义见对应领域契约） / Field limit"}},"required":["prefix","limit"]}
  - name: "SuggestItem"
    description: {zh: "联想词条目", en: "Suggestion item"}
    schema: {"type":"object","description":"联想词条目 / Suggestion item","additionalProperties":false,"properties":{"text":{"type":"string","minLength":1,"description":"文本内容 / Text"},"kind":{"type":"string","enum":["QUERY","HOT","HISTORY"],"description":"字段 kind（语义见对应领域契约） / Field kind"},"heat":{"type":"number","description":"字段 heat（语义见对应领域契约） / Field heat"}},"required":["text","kind"]}
  - name: "SuggestPage"
    description: {zh: "领域分页响应", en: "Domain page response"}
    schema: {"type":"object","additionalProperties":false,"description":"领域分页响应 / Domain page response｜与 PageResult 完全相同的分页封套字段（items/total/nextCursor/hasMore），items 使用该领域具名条目契约 / Same envelope fields as PageResult with domain-specific typed items","properties":{"items":{"type":"array","items":{"$ref":"urn:normify:bili.discover.suggest:SuggestItem"},"description":"领域条目列表 / Domain item list"},"total":{"type":"integer","minimum":0,"description":"总条数 / Total count"},"nextCursor":{"type":"string","description":"下一页游标 / Next page cursor"},"hasMore":{"type":"boolean","description":"是否还有下一页 / Whether more pages exist"}},"required":["items","hasMore"]}
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
