---
uid: 8034ead9
id: bili.assembly.datasource
parent: bili.assembly
state: planned
tags: [planned, "worker:W-ASSEMBLY", leaf]
name: {zh: "数据源与事务装配", en: "Data source and transaction assembly"}
description:
  zh: >
      连接池、读写分离、事务边界与迁移执行的装配（独占 schema 入口）
  en: >
      Connection pool, read/write split, transaction boundaries and migration execution (sole owner of the schema entry)
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/api/src/datasource.ts"
  - path: "db/schema.sql"
  - path: "apps/api/tests/datasource.test.ts"
  - path: "db/tests/schema.test.ts"
apis:
  - protocol: file
    path: "db/schema.sql"
    description:
      zh: >
          表结构快照入口（由迁移生成）
      en: >
          Schema snapshot entry generated from migrations
types:
  - name: "DataSourceOptions"
    description: {zh: "数据源参数", en: "Data source options"}
    schema: {"type":"object","description":"数据源参数 / Data source options","additionalProperties":false,"properties":{"maxConnections":{"type":"integer","description":"字段 maxConnections（语义见对应领域契约） / Field maxConnections"},"statementTimeoutMs":{"type":"integer","description":"字段 statementTimeoutMs（语义见对应领域契约） / Field statementTimeoutMs"},"readReplica":{"type":"boolean","description":"字段 readReplica（语义见对应领域契约） / Field readReplica"}},"required":["maxConnections","statementTimeoutMs","readReplica"]}
deps:
  - kind: call
    to: bili.infra.db
    label: {zh: "使用 RDS 访问层", en: "Use the RDS access layer"}
  - kind: call
    to: bili.infra.migration.content
    label: {zh: "执行迁移", en: "Run migrations"}
---
