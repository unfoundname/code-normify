---
uid: dc604918
id: bili.infra.search
parent: bili.infra
state: planned
tags: [planned, "worker:W-INFRA", leaf]
name: {zh: "搜索服务适配", en: "Search service adapter"}
description:
  zh: >
      索引、映射、查询 DSL 适配与重建任务
  en: >
      Index, mapping, query DSL adaptation and rebuild jobs
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/platform/search/src/search-adapter.ts"
  - path: "services/platform/search/tests/search-adapter.test.ts"
apis:
  - protocol: rpc
    path: "search.index.upsert"
    description:
      zh: >
          写入或更新索引文档
      en: >
          Upsert an index document
    input: {module: "bili.infra.search", name: "IndexDocumentRequest"}
  - protocol: rpc
    path: "search.query"
    description:
      zh: >
          执行检索查询
      en: >
          Run a search query
types:
  - name: "IndexDocumentRequest"
    description: {zh: "索引写入请求", en: "Index document request"}
    schema: {"type":"object","description":"索引写入请求 / Index document request","additionalProperties":false,"properties":{"indexName":{"type":"string","minLength":1,"description":"字段 indexName（语义见对应领域契约） / Field indexName"},"documentId":{"type":"string","minLength":1,"description":"字段 documentId（语义见对应领域契约） / Field documentId"},"document":{"$ref":"urn:normify:bili.contract.common:SearchDocument","description":"字段 document（语义见对应领域契约） / Field document"}},"required":["indexName","documentId","document"]}
  - name: "SearchQueryRequest"
    description: {zh: "检索查询请求", en: "Search query request"}
    schema: {"type":"object","description":"检索查询请求 / Search query request","additionalProperties":false,"properties":{"query":{"$ref":"urn:normify:bili.contract.common:SearchQuery","description":"检索词 / Search query"}},"required":["query"]}
deps:
  - kind: reference
    to: bili.contract.common
    label: {zh: "统一分页与错误契约", en: "Unified pagination and error"}
---
