---
uid: d6249c77
id: bili.client.web.pgc
parent: bili.client.web
state: planned
tags: [planned, "worker:W-PGC", leaf]
name: {zh: "番剧与课程", en: "Premium content and courses"}
description:
  zh: >
      番剧季度页、剧集列表、追番、评分与课程学习
  en: >
      Season pages, episode lists, following, ratings and course learning
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/web/src/features/pgc/SeasonPage.tsx"
  - path: "apps/web/src/features/pgc/CoursePage.tsx"
  - path: "apps/web/tests/features/pgc/SeasonPage.test.tsx"
  - path: "apps/web/tests/features/pgc/CoursePage.test.tsx"
apis:
  - protocol: http
    method: GET
    path: "/bangumi/:seasonId"
    description:
      zh: >
          番剧详情路由
      en: >
          Season route
    output: {module: "bili.client.web.pgc", name: "SeasonPageModel"}
types:
  - name: "SeasonPageModel"
    description: {zh: "季度页视图模型", en: "Season page model"}
    schema: {"type":"object","description":"季度页视图模型 / Season page model","additionalProperties":false,"properties":{"season":{"$ref":"urn:normify:bili.pgc.series:SeasonView","description":"字段 season（语义见对应领域契约） / Field season"},"episodes":{"type":"array","items":{"$ref":"urn:normify:bili.pgc.series:EpisodeView"},"description":"字段 episodes（语义见对应领域契约） / Field episodes"},"followed":{"type":"boolean","description":"字段 followed（语义见对应领域契约） / Field followed"}},"required":["season","episodes","followed"]}
deps:
  - kind: call
    to: bili.pgc.series
    label: {zh: "季度与剧集", en: "Season and episodes"}
  - kind: call
    to: bili.pgc.follow
    label: {zh: "追番操作", en: "Follow action"}
  - kind: call
    to: bili.pgc.course
    label: {zh: "课程与学习进度", en: "Course and progress"}
  - kind: call
    to: bili.client.shared.http
    label: {zh: "统一请求层与错误形态", en: "Unified request layer and"}
  - kind: reference
    to: bili.client.shared.design
    label: {zh: "设计系统与组件", en: "Design system and components"}
---
