---
uid: 0248b0a5
id: bili.client.web.features.discovery
parent: bili.client.web.features
state: planned
tags: ["worker:web-discovery"]
name: {zh: "发现与搜索前端", en: "Discovery Feature"}
description:
  zh: >
      首页多区段渲染、分区导航、榜单页、搜索结果页与建议下拉、不感兴趣反馈。
      
  en: >
      Home sections, partition navigation, ranking pages, search results with suggestions and feedback.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/web/src/features/discovery/index.ts"
  - path: "apps/web/src/features/discovery/pages/HomePage.tsx"
  - path: "apps/web/src/features/discovery/pages/SearchResultPage.tsx"
  - path: "apps/web/src/features/discovery/tests/discovery.test.tsx"
apis: []
types:
  - name: "HomeFeedViewModel"
    description: {zh: "首页视图模型", en: "Home feed view model"}
    schema: {"type":"object","additionalProperties":false,"properties":{"sections":{"type":"array","description":"区段","items":{"$ref":"urn:normify:bili.discovery.home:HomeFeedSection"}},"activePartitionId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"scrollRestoreKey":{"type":"string","description":"滚动恢复键"},"refreshedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["sections","refreshedAt"]}
  - name: "SearchPageState"
    description: {zh: "搜索页状态", en: "Search page state"}
    schema: {"type":"object","additionalProperties":false,"properties":{"request":{"$ref":"urn:normify:bili.discovery.search:SearchRequest"},"result":{"$ref":"urn:normify:bili.discovery.search:SearchResultPage"},"suggestions":{"type":"array","description":"建议","items":{"$ref":"urn:normify:bili.discovery.search:SearchSuggestion"}},"history":{"type":"array","description":"本地历史词","items":{"type":"string","description":"词"}},"error":{"$ref":"urn:normify:bili.contract.core.errors:ApiError"}},"required":["request"]}
deps:
  - kind: call
    to: bili.discovery.home
    to_api: "GET /api/v1/discovery/home"
    label: {zh: "首页与分区流", en: "Home and partition feed"}
  - kind: call
    to: bili.discovery.search
    to_api: "GET /api/v1/search"
    label: {zh: "搜索与建议", en: "Search and suggestions"}
  - kind: call
    to: bili.discovery.ranking
    to_api: "GET /api/v1/rankings/{boardId}"
    label: {zh: "榜单与热搜", en: "Rankings and hot terms"}
  - kind: call
    to: bili.discovery.behavior
    to_api: "POST /api/v1/behaviors"
    label: {zh: "曝光与反馈上报", en: "Exposure and feedback"}
---
