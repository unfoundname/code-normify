---
uid: 3a4f152f
id: bili.discover.recommend
parent: bili.discover
state: planned
tags: [planned, "worker:W-DISCOVER", leaf]
name: {zh: "推荐", en: "Recommendation"}
description:
  zh: >
      召回、排序、特征、相关推荐与冷启动
  en: >
      Recall, ranking, features, related items and cold start
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/discover/recommend/src/recommend.ts"
  - path: "services/discover/recommend/tests/recommend.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/discover/recommendations"
    description:
      zh: >
          推荐结果
      en: >
          Recommendation results
    input: {module: "bili.discover.recommend", name: "RecommendRequest"}
    output: {module: "bili.contract.common", name: "PageResult"}
types:
  - name: "RecommendRequest"
    description: {zh: "推荐请求", en: "Recommend request"}
    schema: {"type":"object","description":"推荐请求 / Recommend request","additionalProperties":false,"properties":{"userId":{"$ref":"urn:normify:bili.contract.common:Id","description":"用户 ID / User id"},"scene":{"type":"string","enum":["HOME","RELATED","FEED","SEARCH","PGC"],"description":"字段 scene（语义见对应领域契约） / Field scene"},"candidateLimit":{"type":"integer","description":"字段 candidateLimit（语义见对应领域契约） / Field candidateLimit"}},"required":["scene","candidateLimit"]}
deps:
  - kind: call
    to: bili.discover.feedback
    label: {zh: "读取行为反馈调整排序", en: "Read feedback to adjust"}
  - kind: call
    to: bili.social.follow
    label: {zh: "关注关系特征", en: "Follow graph features"}
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
