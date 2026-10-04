---
uid: d6297320
id: bili.client.web.shell
parent: bili.client.web
state: planned
tags: ["worker:web-shell"]
name: {zh: "应用装配与路由", en: "App Shell and Routing"}
description:
  zh: >
      集成 Worker 独占：应用装配、路由入口、全局布局、权限守卫、路由级懒加载清单。
      
  en: >
      Sole integration worker: app assembly, route entries, global layout, guards, lazy-load manifest.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/web/src/app/AppShell.tsx"
  - path: "apps/web/src/app/routes.tsx"
  - path: "apps/web/src/app/providers.tsx"
  - path: "apps/web/tests/shell.test.tsx"
apis: []
types:
  - name: "WebRoute"
    description: {zh: "路由清单条目", en: "Web route entry"}
    schema: {"type":"object","additionalProperties":false,"description":"路由只登记，不承载业务逻辑","properties":{"path":{"type":"string","description":"路径，如 /video/:bvid"},"featureModule":{"type":"string","description":"所属领域功能模块 id"},"lazyImport":{"type":"string","description":"懒加载入口"},"authRequired":{"type":"boolean","description":"是否需要登录"},"requiredPermission":{"$ref":"urn:normify:bili.contract.core.authz:PermissionCode"}},"required":["path","featureModule","lazyImport","authRequired"]}
  - name: "AppBootstrap"
    description: {zh: "应用启动数据", en: "App bootstrap payload"}
    schema: {"type":"object","additionalProperties":false,"properties":{"locale":{"type":"string","enum":["zh-CN","en-US"],"description":"语言"},"theme":{"type":"string","description":"主题"},"session":{"$ref":"urn:normify:bili.contract.core.authz:AuthContext"},"featureFlags":{"type":"array","description":"特性开关","items":{"type":"string","description":"开关名"}},"apiBaseUrl":{"type":"string","description":"接口基地址"}},"required":["locale","apiBaseUrl"]}
deps:
  - kind: reference
    to: bili.contract.core.authz
    label: {zh: "渲染登录守卫", en: "Read auth context for guards"}
  - kind: call
    to: bili.contract.core.errors
    label: {zh: "统一错误解析", en: "Unified error parsing"}
---
