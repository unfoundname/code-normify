---
uid: 699c1c78
id: bili.client.app.build
parent: bili.client.app
state: planned
tags: [planned, "worker:W-WEB-CORE", leaf]
name: {zh: "前端构建与质量门", en: "Front-end build and quality gates"}
description:
  zh: >
      打包配置、分包策略、体积预算与静态检查
  en: >
      Bundling, code splitting, size budgets and static analysis
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/web/vite.config.ts"
  - path: "apps/web/package.json"
  - path: "apps/web/tests/vite.config.test.ts"
  - path: "apps/web/tests/package.test.ts"
apis:
  - protocol: file
    path: "apps/web/vite.config.ts"
    description:
      zh: >
          构建配置入口
      en: >
          Build configuration entry
types:
  - name: "BuildProfile"
    description: {zh: "构建配置", en: "Build profile"}
    schema: {"type":"object","description":"构建配置 / Build profile","additionalProperties":false,"properties":{"mode":{"type":"string","enum":["dev","staging","prod"],"description":"字段 mode（语义见对应领域契约） / Field mode"},"publicPath":{"type":"string","minLength":1,"description":"字段 publicPath（语义见对应领域契约） / Field publicPath"},"analyze":{"type":"boolean","description":"字段 analyze（语义见对应领域契约） / Field analyze"}},"required":["mode","publicPath","analyze"]}
deps:
  - kind: reference
    to: bili.client.shared.design
    label: {zh: "设计系统与组件", en: "Design system and components"}
---
