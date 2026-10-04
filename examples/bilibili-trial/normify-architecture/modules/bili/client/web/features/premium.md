---
uid: 911e6e2e
id: bili.client.web.features.premium
parent: bili.client.web.features
state: planned
tags: ["worker:web-premium"]
name: {zh: "番剧与课堂前端", en: "Premium Feature"}
description:
  zh: >
      番剧详情与追番、排期日历、评分短评、试看与付费解锁、课程详情与学习页。
      
  en: >
      Season detail and follows, airing calendar, ratings, preview and paid unlock, course detail and learning page.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/web/src/features/premium/index.ts"
  - path: "apps/web/src/features/premium/pages/SeasonDetailPage.tsx"
  - path: "apps/web/src/features/premium/pages/CoursePlayerPage.tsx"
  - path: "apps/web/src/features/premium/tests/premium.test.tsx"
apis: []
types:
  - name: "SeasonDetailState"
    description: {zh: "番剧详情状态", en: "Season detail state"}
    schema: {"type":"object","additionalProperties":false,"properties":{"season":{"$ref":"urn:normify:bili.premium.bangumi:SeasonRecord"},"episodes":{"type":"array","description":"分集","items":{"$ref":"urn:normify:bili.premium.bangumi:EpisodeRecord"}},"schedule":{"type":"array","description":"排期","items":{"$ref":"urn:normify:bili.premium.schedule:AirSchedule"}},"followed":{"type":"boolean","description":"是否已追番"},"myRating":{"type":"integer","description":"我的评分","minimum":0,"maximum":10},"entitlement":{"$ref":"urn:normify:bili.premium.entitlement:PlaybackEntitlement"},"error":{"$ref":"urn:normify:bili.contract.core.errors:ApiError"}},"required":["season","followed"]}
  - name: "CoursePlayerState"
    description: {zh: "课程学习状态", en: "Course learning state"}
    schema: {"type":"object","additionalProperties":false,"properties":{"course":{"$ref":"urn:normify:bili.premium.classroom:CourseRecord"},"enrollment":{"$ref":"urn:normify:bili.premium.classroom:CourseEnrollment"},"activeLessonId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"progress":{"$ref":"urn:normify:bili.premium.classroom:LearningProgress"},"quizOpen":{"type":"boolean","description":"是否展开随堂测验"},"error":{"$ref":"urn:normify:bili.contract.core.errors:ApiError"}},"required":["course","activeLessonId"]}
deps:
  - kind: call
    to: bili.premium.bangumi
    to_api: "GET /api/v1/seasons/{id}"
    label: {zh: "剧集与分集", en: "Seasons and episodes"}
  - kind: call
    to: bili.premium.schedule
    to_api: "POST /api/v1/seasons/{id}/follow"
    label: {zh: "排期、追番与评分", en: "Schedule and follows"}
  - kind: call
    to: bili.premium.entitlement
    to_api: "GET /api/v1/entitlements/{targetType}/{targetId}"
    label: {zh: "权益与试看", en: "Entitlement and preview"}
  - kind: call
    to: bili.premium.classroom
    to_api: "GET /api/v1/courses/{id}"
    label: {zh: "课程与学习进度", en: "Courses and progress"}
  - kind: call
    to: bili.commerce.order
    to_api: "POST /api/v1/orders"
    label: {zh: "付费解锁下单", en: "Paid unlock order"}
---
