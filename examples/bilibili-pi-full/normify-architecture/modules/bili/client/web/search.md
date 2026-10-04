---
uid: 24ebeed5
id: bili.client.web.search
parent: bili.client.web
state: planned
tags: [planned, "worker:W-DISCOVER", leaf]
name: {zh: "搜索页", en: "Search page"}
description:
  zh: >
      多类型检索、筛选、建议与结果高亮
  en: >
      Multi-type search, filters, suggestions and result highlighting
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/web/src/features/search/SearchPage.tsx"
  - path: "apps/web/tests/features/search/SearchPage.test.tsx"
apis:
  - protocol: http
    method: GET
    path: "/search"
    description:
      zh: >
          搜索页路由
      en: >
          Search route
    output: {module: "bili.client.web.search", name: "SearchPageModel"}
types:
  - name: "SearchPageModel"
    description: {zh: "搜索页视图模型", en: "Search page model"}
    schema: {"type":"object","description":"搜索页视图模型 / Search page model","additionalProperties":false,"properties":{"query":{"type":"string","minLength":1,"description":"检索词 / Search query"},"activeType":{"type":"string","enum":["VIDEO","USER","LIVE","ANIME","ARTICLE","AUDIO"],"description":"字段 activeType（语义见对应领域契约） / Field activeType"},"results":{"$ref":"urn:normify:bili.contract.common:PageResult","description":"字段 results（语义见对应领域契约） / Field results"}},"required":["query","activeType","results"]}
deps:
  - kind: call
    to: bili.discover.search
    label: {zh: "检索接口", en: "Search API"}
  - kind: call
    to: bili.discover.suggest
    label: {zh: "联想与热搜", en: "Suggestions and hot queries"}
  - kind: call
    to: bili.client.shared.http
    label: {zh: "统一请求层与错误形态", en: "Unified request layer and"}
  - kind: reference
    to: bili.client.shared.design
    label: {zh: "设计系统与组件", en: "Design system and components"}
---
