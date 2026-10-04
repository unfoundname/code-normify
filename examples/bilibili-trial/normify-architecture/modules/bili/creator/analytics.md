---
uid: 5b2e771f
id: bili.creator.analytics
parent: bili.creator
state: planned
tags: ["worker:cre-analytics"]
name: {zh: "数据分析与粉丝画像", en: "Analytics and Audience"}
description:
  zh: >
      播放/互动/涨粉/收益多维时间序列、分 P 与分区对比、观众画像与活跃时段；全部来自事件投影。
      
  en: >
      Multi-metric time series, per-episode and partition comparison, audience profile and active hours from projections.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/creator/analytics/src/series.ts"
  - path: "services/creator/analytics/src/audience.ts"
  - path: "services/creator/analytics/tests/analytics.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/creator/analytics/series"
    description:
      zh: >
          读取指标时间序列
          
      en: >
          Get analytics series
          
    input: {module: "bili.creator.analytics", name: "AnalyticsQuery"}
    output: {module: "bili.creator.analytics", name: "AnalyticsSeries"}
  - protocol: http
    method: GET
    path: "/api/v1/creator/analytics/audience"
    description:
      zh: >
          读取观众画像
          
      en: >
          Get audience profile
          
    input: {module: "bili.creator.analytics", name: "AnalyticsQuery"}
    output: {module: "bili.creator.analytics", name: "AudienceProfile"}
types:
  - name: "AnalyticsQuery"
    description: {zh: "分析查询", en: "Analytics query"}
    schema: {"type":"object","additionalProperties":false,"description":"只接受 owner 自己的数据；跨主体查询需运营权限","properties":{"ownerId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"metric":{"type":"string","enum":["play","danmaku","comment","coin","favorite","share","follower_gain","revenue","watch_time"],"description":"指标"},"dimension":{"type":"string","enum":["video","partition","date","region","device","source"],"description":"维度"},"granularity":{"type":"string","enum":["hour","day","week","month"],"description":"粒度"},"dateFrom":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"dateTo":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"videoId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"partitionId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"}},"required":["metric","dimension","granularity","dateFrom","dateTo"]}
  - name: "AnalyticsSeries"
    description: {zh: "分析序列", en: "Analytics series"}
    schema: {"type":"object","additionalProperties":false,"description":"投影数据，非权威；需向前端暴露延迟","properties":{"metric":{"type":"string","description":"指标"},"dimension":{"type":"string","description":"维度"},"points":{"type":"array","description":"数据点","items":{"type":"object","additionalProperties":false,"properties":{"bucket":{"type":"string","description":"时间桶/维度值"},"value":{"type":"integer","description":"值","minimum":0}},"required":["bucket","value"]}},"total":{"type":"integer","description":"合计","minimum":0},"compareTotal":{"type":"integer","description":"对比期合计","minimum":0},"compareRateBps":{"type":"integer","description":"同比（基点）"},"dataLatencySeconds":{"type":"integer","description":"数据延迟秒","minimum":0},"rebuildable":{"type":"boolean","description":"是否可由事件重算"}},"required":["metric","points","total"]}
  - name: "AudienceProfile"
    description: {zh: "观众画像", en: "Audience profile"}
    schema: {"type":"object","additionalProperties":false,"description":"小样本不输出画像，避免反推个人数据","properties":{"ownerId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"periodDays":{"type":"integer","description":"统计天数","minimum":1},"ageBuckets":{"type":"array","description":"年龄段分布","items":{"type":"object","additionalProperties":false,"properties":{"bucket":{"type":"string","description":"区间"},"ratioBps":{"type":"integer","description":"占比（基点）","minimum":0,"maximum":10000}},"required":["bucket","ratioBps"]}},"genderBuckets":{"type":"array","description":"性别分布","items":{"type":"object","additionalProperties":false,"properties":{"bucket":{"type":"string","description":"性别"},"ratioBps":{"type":"integer","description":"占比（基点）","minimum":0,"maximum":10000}},"required":["bucket","ratioBps"]}},"regionBuckets":{"type":"array","description":"地域分布","items":{"type":"object","additionalProperties":false,"properties":{"bucket":{"type":"string","description":"地域"},"ratioBps":{"type":"integer","description":"占比（基点）","minimum":0,"maximum":10000}},"required":["bucket","ratioBps"]}},"activeHours":{"type":"array","description":"活跃时段","items":{"type":"integer","description":"小时 0-23","minimum":0,"maximum":23}},"minSampleSize":{"type":"integer","description":"最小样本量（低于则不出报告）","minimum":0}},"required":["ownerId","periodDays","minSampleSize"]}
deps:
  - kind: dataflow
    to: bili.data.projections
    label: {zh: "指标来自可重算投影", en: "Metrics from rebuildable proje"}
  - kind: call
    to: bili.discovery.behavior
    from_api: "GET /api/v1/creator/analytics/series"
    to_api: "POST /api/v1/behaviors"
    label: {zh: "行为事件为分析底座", en: "Behavior events as base"}
  - kind: call
    to: bili.social.follow
    label: {zh: "粉丝增长与结构", en: "Follower growth and structure"}
  - kind: call
    to: bili.creator.works
    label: {zh: "指标按稿件维度关联", en: "Join with own works"}
---
