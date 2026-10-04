---
uid: "54560857"
id: bili.client.app.router
parent: bili.client.app
state: planned
tags: [planned, "worker:W-WEB-CORE", leaf]
name: {zh: "路由入口", en: "Router entry"}
description:
  zh: >
      路由表、按领域懒加载、鉴权守卫与深链接
  en: >
      Route table, per-domain lazy loading, auth guards and deep links
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/web/src/app/router.tsx"
  - path: "apps/web/src/app/route-manifest.ts"
  - path: "apps/web/tests/app/router.test.tsx"
  - path: "apps/web/tests/app/route-manifest.test.ts"
apis:
  - protocol: file
    path: "apps/web/src/app/router.tsx"
    description:
      zh: >
          路由入口（独占）
      en: >
          Router entry (sole owner)
types:
  - name: "RouteManifestEntry"
    description: {zh: "路由清单项", en: "Route manifest entry"}
    schema: {"type":"object","description":"路由清单项 / Route manifest entry","additionalProperties":false,"properties":{"path":{"type":"string","minLength":1,"description":"字段 path（语义见对应领域契约） / Field path"},"featureModule":{"type":"string","minLength":1,"description":"字段 featureModule（语义见对应领域契约） / Field featureModule"},"requiresLogin":{"type":"boolean","description":"字段 requiresLogin（语义见对应领域契约） / Field requiresLogin"},"permissionCode":{"type":"string","minLength":1,"description":"字段 permissionCode（语义见对应领域契约） / Field permissionCode"}},"required":["path","featureModule","requiresLogin"]}
deps:
  - kind: call
    to: bili.client.web.home
    label: {zh: "首页路由", en: "Home route"}
  - kind: call
    to: bili.client.web.video
    label: {zh: "播放页路由", en: "Playback route"}
  - kind: call
    to: bili.client.web.publish
    label: {zh: "投稿台路由", en: "Publish route"}
  - kind: reference
    to: bili.client.shared.design
    label: {zh: "设计系统与组件", en: "Design system and components"}
---
