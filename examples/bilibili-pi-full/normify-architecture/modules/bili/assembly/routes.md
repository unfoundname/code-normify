---
uid: 1624b5c6
id: bili.assembly.routes
parent: bili.assembly
state: planned
tags: [planned, "worker:W-ASSEMBLY", leaf]
name: {zh: "路由注册表", en: "Route registry"}
description:
  zh: >
      按域注册路由与权限码，路由文件由集成 Worker 独占
  en: >
      Register per-domain routes and permission codes; the route file is owned solely by the integration worker
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/api/src/routes.ts"
  - path: "apps/api/tests/routes.test.ts"
apis:
  - protocol: file
    path: "apps/api/src/routes.ts"
    description:
      zh: >
          路由注册入口
      en: >
          Route registry entry
types:
  - name: "RouteRegistration"
    description: {zh: "路由注册项", en: "Route registration"}
    schema: {"type":"object","description":"路由注册项 / Route registration","additionalProperties":false,"properties":{"routeId":{"type":"string","minLength":1,"description":"字段 routeId（语义见对应领域契约） / Field routeId"},"ownerModule":{"type":"string","minLength":1,"description":"字段 ownerModule（语义见对应领域契约） / Field ownerModule"},"permissionCode":{"type":"string","minLength":1,"description":"字段 permissionCode（语义见对应领域契约） / Field permissionCode"},"pathPrefix":{"type":"string","minLength":1,"description":"字段 pathPrefix（语义见对应领域契约） / Field pathPrefix"}},"required":["routeId","ownerModule","permissionCode","pathPrefix"]}
deps:
  - kind: call
    to: bili.infra.gateway
    label: {zh: "挂载网关中间件", en: "Mount gateway middleware"}
---
