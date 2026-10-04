---
uid: 4313d9af
id: bili.assembly.server
parent: bili.assembly
state: planned
tags: [planned, "worker:W-ASSEMBLY", leaf]
name: {zh: "API 应用装配", en: "API application assembly"}
description:
  zh: >
      应用容器、中间件顺序、优雅停机与健康检查（独占 app 入口文件）
  en: >
      Application container, middleware order, graceful shutdown and health checks (sole owner of the app entry file)
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/api/src/app.ts"
  - path: "apps/api/tests/app.test.ts"
apis:
  - protocol: file
    path: "apps/api/src/app.ts"
    description:
      zh: >
          API 应用装配入口
      en: >
          API application assembly entry
types:
  - name: "AppBootstrapOptions"
    description: {zh: "应用启动参数", en: "App bootstrap options"}
    schema: {"type":"object","description":"应用启动参数 / App bootstrap options","additionalProperties":false,"properties":{"port":{"type":"integer","description":"字段 port（语义见对应领域契约） / Field port"},"env":{"type":"string","enum":["dev","staging","prod"],"description":"字段 env（语义见对应领域契约） / Field env"},"enableMqConsumers":{"type":"boolean","description":"字段 enableMqConsumers（语义见对应领域契约） / Field enableMqConsumers"}},"required":["port","env","enableMqConsumers"]}
deps:
  - kind: call
    to: bili.assembly.routes
    label: {zh: "注册全部路由", en: "Register all routes"}
  - kind: call
    to: bili.infra.observe
    label: {zh: "接入指标与追踪", en: "Wire metrics and tracing"}
  - kind: call
    to: bili.assembly.datasource
    label: {zh: "装配数据源与事务", en: "Wire data sources and"}
---
