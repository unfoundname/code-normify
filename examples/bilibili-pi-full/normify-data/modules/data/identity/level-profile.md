---
uid: e632e144
id: data.identity.level-profile
parent: data.identity
state: planned
tags: [planned, "worker:W-IDENTITY", "storage:rds"]
name: {zh: "等级档案", en: "Level profile"}
description:
  zh: >
      经验值、等级与每日经验上限
  en: >
      Experience, level and the daily experience cap
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/identity/models/level_profile.model.sql"
apis:
  - protocol: rpc
    path: "db.table.identity_level_profile"
    description:
      zh: >
          权威表 identity_level_profile（唯一业务写入所有者：W-IDENTITY；RDS 方言与适配器待定）
      en: >
          Authoritative table identity_level_profile (sole write owner: W-IDENTITY; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/identity/models/level_profile.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "LevelProfileRow"
    description: {zh: "经验值、等级与每日经验上限", en: "Experience, level and the daily experience cap"}
    schema: {"type":"object","additionalProperties":false,"description":"经验值、等级与每日经验上限 / Experience, level and the daily experience cap｜存储归属 RDS｜唯一写入所有者 W-IDENTITY｜表 identity_level_profile；主键 PK(id)；唯一约束 UNIQUE(userId)；索引 INDEX(currentLevel)；外键 FK(userId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"userId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"currentLevel":{"type":"integer","description":"currentLevel 字段 / Field currentLevel"},"currentExp":{"type":"integer","description":"currentExp 字段 / Field currentExp"},"dailyExp":{"type":"integer","description":"dailyExp 字段 / Field dailyExp"},"updatedAt":{"type":"string","format":"date-time","description":"updatedAt 字段 / Field updatedAt"}},"required":["id","userId","currentLevel","currentExp","dailyExp","updatedAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "userId→user.id，多对一", en: "userId->user.id, many-to-one"}
---
