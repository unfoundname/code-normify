---
uid: 47a0ef60
id: bili.data.model
parent: bili.data
state: planned
tags: ["worker:data-steward"]
name: {zh: "关系模型与表归属", en: "Relational Model and Ownership"}
description:
  zh: >
      统一关系模型、命名规范、每表唯一写入所有者、外键/唯一约束/索引登记；数据库方言待明确。
      
  en: >
      Unified relational model, naming, one write-owner per table, FK/unique/index registry; dialect pending.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "db/model/ownership.md"
  - path: "db/model/naming.md"
apis: []
types:
  - name: "TableOwnership"
    description: {zh: "表写入所有者登记", en: "Table write ownership"}
    schema: {"type":"object","additionalProperties":false,"description":"跨行约束由 RDS 实施，不在 JSON Schema 中声明已校验","properties":{"table":{"type":"string","description":"表名（snake_case，单数）"},"ownerModule":{"type":"string","description":"唯一业务写入所有者模块 id"},"primaryKey":{"type":"string","description":"主键定义"},"uniques":{"type":"array","description":"唯一约束（含复合唯一）","items":{"type":"string","description":"约束定义"}},"indexes":{"type":"array","description":"索引定义","items":{"type":"string","description":"索引定义"}},"foreignKeys":{"type":"array","description":"外键与基数","items":{"type":"string","description":"外键定义"}},"projectionConsumers":{"type":"array","description":"投影/只读消费者","items":{"type":"string","description":"模块 id"}}},"required":["table","ownerModule","primaryKey"]}
  - name: "MigrationContract"
    description: {zh: "迁移实施契约", en: "Migration contract"}
    schema: {"type":"object","additionalProperties":false,"description":"引擎未指定前禁止假定具体方言","properties":{"migrationId":{"type":"string","description":"迁移 id，如 0007_comment_reply"},"dialect":{"type":"string","enum":["postgresql","mysql","pending_decision"],"description":"关系方言（实施前确认，禁止运行时猜测切换）"},"appliesTo":{"type":"array","description":"目标表","items":{"type":"string","description":"表名"}},"reversible":{"type":"boolean","description":"是否可回滚"},"lockRisk":{"type":"string","enum":["none","short","long_online_ddl"],"description":"锁风险"},"ownerModule":{"type":"string","description":"负责 Worker 的模块 id"}},"required":["migrationId","dialect","appliesTo","reversible"]}
---
