---
uid: 4edac498
id: data.identity.block-relation
parent: data.identity
state: planned
tags: [planned, "worker:W-IDENTITY", "storage:rds"]
name: {zh: "黑名单关系", en: "Block relation"}
description:
  zh: >
      拉黑关系与来源
  en: >
      Block relations and their source
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/identity/models/block_relation.model.sql"
apis:
  - protocol: rpc
    path: "db.table.identity_block_relation"
    description:
      zh: >
          权威表 identity_block_relation（唯一业务写入所有者：W-IDENTITY；RDS 方言与适配器待定）
      en: >
          Authoritative table identity_block_relation (sole write owner: W-IDENTITY; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/identity/models/block_relation.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "BlockRelationRow"
    description: {zh: "拉黑关系与来源", en: "Block relations and their source"}
    schema: {"type":"object","additionalProperties":false,"description":"拉黑关系与来源 / Block relations and their source｜存储归属 RDS｜唯一写入所有者 W-IDENTITY｜表 identity_block_relation；主键 PK(id)；唯一约束 UNIQUE(ownerId,blockedId)；索引 INDEX(blockedId)；外键 FK(ownerId→data.identity.user.id, blockedId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"ownerId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"blockedId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"source":{"type":"string","description":"source 字段 / Field source"},"createdAt":{"type":"string","format":"date-time","description":"createdAt 字段 / Field createdAt"}},"required":["id","ownerId","blockedId","source","createdAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "ownerId→user.id+blockedId→user", en: "ownerId->user.id+blockedId->us"}
---
