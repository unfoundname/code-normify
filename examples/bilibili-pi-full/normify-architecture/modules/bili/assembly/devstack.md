---
uid: "886e3565"
id: bili.assembly.devstack
parent: bili.assembly
state: planned
tags: [planned, "worker:W-ASSEMBLY", leaf]
name: {zh: "本地开发栈", en: "Local dev stack"}
description:
  zh: >
      本地 compose、种子数据与一键启动脚本
  en: >
      Local compose, seed data and one-command startup scripts
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "infra/devstack/docker-compose.yml"
  - path: "infra/devstack/seed.mjs"
  - path: "infra/devstack/tests/docker-compose.test.ts"
  - path: "infra/devstack/tests/seed.test.mjs"
apis:
  - protocol: file
    path: "infra/devstack/docker-compose.yml"
    description:
      zh: >
          本地开发栈入口
      en: >
          Local dev stack entry
types:
  - name: "DevStackOptions"
    description: {zh: "本地栈参数", en: "Dev stack options"}
    schema: {"type":"object","description":"本地栈参数 / Dev stack options","additionalProperties":false,"properties":{"runMigrations":{"type":"boolean","description":"字段 runMigrations（语义见对应领域契约） / Field runMigrations"},"seedFixtures":{"type":"boolean","description":"字段 seedFixtures（语义见对应领域契约） / Field seedFixtures"},"exposePorts":{"type":"array","items":{"type":"integer"},"description":"字段 exposePorts（语义见对应领域契约） / Field exposePorts"}},"required":["runMigrations","seedFixtures","exposePorts"]}
deps:
  - kind: call
    to: bili.assembly.datasource
    label: {zh: "启动时执行迁移", en: "Run migrations on startup"}
---
