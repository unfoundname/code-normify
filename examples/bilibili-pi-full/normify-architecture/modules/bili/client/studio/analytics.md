---
uid: 4d373f89
id: bili.client.studio.analytics
parent: bili.client.studio
state: planned
tags: [planned, "worker:W-CREATOR", leaf]
name: {zh: "数据与粉丝分析台", en: "Analytics and fan console"}
description:
  zh: >
      趋势图表、对比、粉丝分层与导出
  en: >
      Trend charts, comparisons, fan tiers and export
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/studio/src/features/analytics/AnalyticsConsole.tsx"
  - path: "apps/studio/tests/features/analytics/AnalyticsConsole.test.tsx"
apis:
  - protocol: http
    method: GET
    path: "/studio/analytics"
    description:
      zh: >
          数据分析路由
      en: >
          Analytics route
    output: {module: "bili.client.studio.analytics", name: "AnalyticsViewModel"}
types:
  - name: "AnalyticsViewModel"
    description: {zh: "数据分析视图模型", en: "Analytics view model"}
    schema: {"type":"object","description":"数据分析视图模型 / Analytics view model","additionalProperties":false,"properties":{"metrics":{"type":"array","items":{"type":"string","minLength":1},"description":"字段 metrics（语义见对应领域契约） / Field metrics"},"range":{"type":"string","enum":["SEVEN_DAYS","THIRTY_DAYS","QUARTER","CUSTOM"],"description":"字段 range（语义见对应领域契约） / Field range"},"fans":{"$ref":"urn:normify:bili.creator.fans:FansOverview","description":"字段 fans（语义见对应领域契约） / Field fans"}},"required":["metrics","range","fans"]}
deps:
  - kind: call
    to: bili.creator.analytics
    label: {zh: "创作数据", en: "Creator analytics"}
  - kind: call
    to: bili.creator.fans
    label: {zh: "粉丝分析", en: "Fan analytics"}
  - kind: call
    to: bili.client.shared.http
    label: {zh: "统一请求层与错误形态", en: "Unified request layer and"}
  - kind: reference
    to: bili.client.shared.design
    label: {zh: "设计系统与组件", en: "Design system and components"}
---
