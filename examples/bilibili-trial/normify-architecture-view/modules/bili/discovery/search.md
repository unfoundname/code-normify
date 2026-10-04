---
uid: "98467413"
id: bili.discovery.search
parent: bili.discovery
state: planned
tags: ["worker:disc-search"]
name: {zh: "搜索与建议", en: "Search and Suggestions"}
description:
  zh: >
      多范围检索（视频/UP 主/直播/番剧/课程/专栏/音频/漫画）、建议词、过滤器、纠错与投影写入。
      
  en: >
      Multi-scope retrieval, suggestions, filters, query correction and index projection ingestion.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/discovery/search/src/query.ts"
  - path: "services/discovery/search/src/suggest.ts"
  - path: "services/discovery/search/src/projection.ts"
  - path: "services/discovery/search/tests/search.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/search"
    description:
      zh: >
          检索内容
          
      en: >
          Search content
          
    input: {module: "bili.discovery.search", name: "SearchRequest"}
    output: {module: "bili.discovery.search", name: "SearchResultPage"}
  - protocol: http
    method: GET
    path: "/api/v1/search/suggest"
    description:
      zh: >
          获取搜索建议
          
      en: >
          Get suggestions
          
    output: {module: "bili.discovery.search", name: "SearchSuggestion"}
  - protocol: http
    method: POST
    path: "/internal/search/projections"
    description:
      zh: >
          接收领域事件投影
          
      en: >
          Ingest index projection
          
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: mysql
    path: "search_index_checkpoint"
    description:
      zh: >
          索引检查点表（唯一写入所有者：搜索服务）
          
      en: >
          search checkpoint table
          
types:
  - name: "SearchRequest"
    description: {zh: "搜索请求", en: "Search request"}
    schema: {"type":"object","additionalProperties":false,"properties":{"keyword":{"type":"string","description":"关键词","minLength":1,"maxLength":60},"scope":{"type":"string","enum":["all","video","user","live","article","season","course","audio","manga"],"description":"范围"},"sort":{"type":"string","enum":["relevance","play_count","danmaku_count","newest","score"],"description":"排序"},"partitionId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"durationRange":{"type":"string","enum":["any","under_10m","10m_to_30m","30m_to_60m","over_60m"],"description":"时长区间"},"publishRange":{"type":"string","enum":["any","day","week","month","year"],"description":"发布时间"},"cursor":{"type":"string","description":"游标"},"pageSize":{"type":"integer","description":"每页条数","minimum":1,"maximum":50}},"required":["keyword","scope","sort"]}
  - name: "SearchHit"
    description: {zh: "搜索结果条目", en: "Search hit"}
    schema: {"type":"object","additionalProperties":false,"description":"来自搜索投影，允许最终一致与轻微滞后","properties":{"targetType":{"type":"string","description":"目标类型"},"targetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"title":{"type":"string","description":"标题"},"highlightTitle":{"type":"string","description":"高亮标题"},"ownerId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"ownerNickname":{"type":"string","description":"UP 主昵称"},"coverAssetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"durationMs":{"type":"integer","description":"时长毫秒","minimum":0},"playCount":{"type":"integer","description":"播放量","minimum":0},"score":{"type":"integer","description":"相关度 ×1000","minimum":0},"indexUpdatedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["targetType","targetId","title","score"]}
  - name: "SearchResultPage"
    description: {zh: "搜索结果分页", en: "Search result page"}
    schema: {"type":"object","additionalProperties":false,"description":"degraded=true 时必须显式告知前端，不得静默降级","properties":{"items":{"type":"array","description":"结果","items":{"$ref":"urn:normify:bili.discovery.search:SearchHit"}},"page":{"$ref":"urn:normify:bili.contract.core.paging:PageMeta"},"correctedQuery":{"type":"string","description":"纠错后查询"},"tookMs":{"type":"integer","description":"耗时毫秒","minimum":0},"degraded":{"type":"boolean","description":"检索是否降级为库内检索"}},"required":["items","page","tookMs"]}
  - name: "SearchSuggestion"
    description: {zh: "搜索建议", en: "Search suggestion"}
    schema: {"type":"object","additionalProperties":false,"properties":{"text":{"type":"string","description":"建议文本","maxLength":60},"type":{"type":"string","enum":["keyword","user","video","topic","hot"],"description":"类型"},"highlight":{"type":"string","description":"高亮片段"},"score":{"type":"integer","description":"排序分","minimum":0}},"required":["text","type","score"]}
deps:
  - kind: call
    to: bili.infra.search
    from_api: "POST /internal/search/projections"
    to_api: "POST /v1/index/{index}/doc"
    label: {zh: "提交与检索索引（引擎待接入）", en: "Submit and query index"}
  - kind: call
    to: bili.publish.catalog
    from_api: "POST /internal/search/projections"
    to_api: "GET /api/v1/catalog/videos"
    label: {zh: "投影数据权威来源为目录", en: "Catalog is source of truth"}
  - kind: call
    to: bili.identity.profile
    label: {zh: "UP 主维度检索", en: "Search by uploader"}
  - kind: reference
    to: bili.data.projections
    label: {zh: "投影规格与检查点契约", en: "Projection contract"}
  - kind: call
    to: bili.infra.observability
    label: {zh: "检索降级与慢查询告警", en: "Alert on degraded search"}
---
