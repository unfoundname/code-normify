---
uid: acc71606
id: data.data.t-b993c5be
parent: data.data
state: planned
tags: ["worker:data-steward", "projection:data-contract"]
name: {zh: "MigrationContract", en: "MigrationContract"}
description:
  zh: >
      迁移实施契约
  en: >
      Migration contract
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/data/t-b993c5be.json"
apis: []
types:
  - name: "MigrationContract"
    description: {zh: "迁移实施契约", en: "Migration contract"}
    schema: {"type":"object","additionalProperties":false,"description":"引擎未指定前禁止假定具体方言","properties":{"migrationId":{"type":"string","description":"迁移 id，如 0007_comment_reply"},"dialect":{"type":"string","enum":["postgresql","mysql","pending_decision"],"description":"关系方言（实施前确认，禁止运行时猜测切换）"},"appliesTo":{"type":"array","description":"目标表","items":{"type":"string","description":"表名"}},"reversible":{"type":"boolean","description":"是否可回滚"},"lockRisk":{"type":"string","enum":["none","short","long_online_ddl"],"description":"锁风险"},"ownerModule":{"type":"string","description":"负责 Worker 的模块 id"}},"required":["migrationId","dialect","appliesTo","reversible"]}
---
