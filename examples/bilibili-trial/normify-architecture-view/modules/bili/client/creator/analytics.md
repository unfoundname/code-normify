---
uid: e0c835d8
id: bili.client.creator.analytics
parent: bili.client.creator
state: planned
tags: ["worker:stu-analytics"]
name: {zh: "数据分析页", en: "Analytics UI"}
description:
  zh: >
      指标趋势图、分 P 对比、观众画像与活跃时段面板，显式展示数据延迟。
      
  en: >
      Metric trend charts, per-episode comparison, audience panels with explicit data latency.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/studio/src/features/analytics/index.ts"
  - path: "apps/studio/src/features/analytics/pages/AnalyticsPage.tsx"
  - path: "apps/studio/src/features/analytics/tests/analytics.test.tsx"
apis: []
types:
  - name: "AnalyticsPageState"
    description: {zh: "分析页状态", en: "Analytics page state"}
    schema: {"type":"object","additionalProperties":false,"properties":{"query":{"$ref":"urn:normify:bili.creator.analytics:AnalyticsQuery"},"series":{"type":"array","description":"序列","items":{"$ref":"urn:normify:bili.creator.analytics:AnalyticsSeries"}},"audience":{"$ref":"urn:normify:bili.creator.analytics:AudienceProfile"},"latencyNoticeSeconds":{"type":"integer","description":"延迟提示秒","minimum":0},"error":{"$ref":"urn:normify:bili.contract.core.errors:ApiError"}},"required":["query"]}
deps:
  - kind: call
    to: bili.creator.analytics
    to_api: "GET /api/v1/creator/analytics/series"
    label: {zh: "指标与画像查询", en: "Metrics and audience"}
---
