---
uid: 9aeb93af
id: data.client.t-8ba2fd40
parent: data.client
state: planned
tags: ["worker:stu-analytics", "projection:data-contract"]
name: {zh: "AnalyticsPageState", en: "AnalyticsPageState"}
description:
  zh: >
      分析页状态
  en: >
      Analytics page state
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/client/t-8ba2fd40.json"
apis: []
types:
  - name: "AnalyticsPageState"
    description: {zh: "分析页状态", en: "Analytics page state"}
    schema: {"type":"object","additionalProperties":false,"properties":{"query":{"$ref":"urn:normify:data.creator.t-5f3fb947:AnalyticsQuery"},"series":{"type":"array","description":"序列","items":{"$ref":"urn:normify:data.creator.t-4b3c331c:AnalyticsSeries"}},"audience":{"$ref":"urn:normify:data.creator.t-dfe57b7a:AudienceProfile"},"latencyNoticeSeconds":{"type":"integer","description":"延迟提示秒","minimum":0},"error":{"$ref":"urn:normify:data.contract.t-2bb69fd6:ApiError"}},"required":["query"]}
deps:
  - kind: reference
    to: data.creator.t-5f3fb947
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.creator.t-4b3c331c
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.creator.t-dfe57b7a
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-2bb69fd6
    label: {zh: "类型引用", en: "Type reference"}
---
