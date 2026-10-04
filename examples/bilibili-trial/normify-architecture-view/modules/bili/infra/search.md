---
uid: c788ca4b
id: bili.infra.search
parent: bili.infra
state: planned
tags: ["worker:infra-search"]
name: {zh: "搜索接入", en: "Search Adapter"}
description:
  zh: >
      搜索引擎未提供：定义索引规格与投影请求契约，业务只发投影事件，不直连引擎。
      
  en: >
      Search engine not provided: index specs and projection requests; business emits projections only.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/search/src/adapter.ts"
  - path: "services/search/src/indexing.ts"
apis:
  - protocol: http
    method: POST
    path: "/v1/index/{index}/doc"
    description:
      zh: >
          提交文档到检索引擎（待接入）
          
      en: >
          Submit document to search engine
          
    input: {module: "bili.infra.search", name: "IndexProjectionRequest"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
types:
  - name: "SearchIndexSpec"
    description: {zh: "索引规格", en: "Index spec"}
    schema: {"type":"object","additionalProperties":false,"properties":{"index":{"type":"string","description":"索引名"},"sourceModule":{"type":"string","description":"数据权威模块"},"fields":{"type":"array","description":"字段定义","items":{"type":"object","additionalProperties":false,"properties":{"name":{"type":"string","description":"字段"},"type":{"type":"string","enum":["keyword","text","integer","date","geo_point"],"description":"类型"},"searchable":{"type":"boolean","description":"是否参与检索"},"sortable":{"type":"boolean","description":"是否可排序"}},"required":["name","type"]}},"refreshSeconds":{"type":"integer","description":"刷新间隔秒","minimum":1},"analyzer":{"type":"string","description":"分词/分析器"}},"required":["index","sourceModule","fields"]}
  - name: "IndexProjectionRequest"
    description: {zh: "索引投影请求", en: "Index projection request"}
    schema: {"type":"object","additionalProperties":false,"description":"由领域事件驱动，幂等按事件 id 去重","properties":{"index":{"type":"string","description":"目标索引"},"docId":{"type":"string","description":"文档 id（=实体 id）"},"operation":{"type":"string","enum":["upsert","delete"],"description":"操作"},"documentJson":{"type":"string","description":"文档内容 JSON"},"sourceEventId":{"type":"string","description":"来源事件 id"},"occurredAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["index","docId","operation","sourceEventId"]}
deps:
  - kind: reference
    to: bili.data.projections
    label: {zh: "投影规格来自数据契约", en: "Projection spec from contracts"}
  - kind: reference
    to: bili.contract.adapters.capabilities
    label: {zh: "搜索引擎待接入", en: "Search engine pending"}
---
