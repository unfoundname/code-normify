---
uid: febe1da5
id: data.pgc.season-follow
parent: data.pgc
state: planned
tags: [planned, "worker:W-PGC", "storage:rds"]
name: {zh: "追番关系", en: "Season follow"}
description:
  zh: >
      追番与提醒
  en: >
      Season follows and reminders
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/pgc/models/season_follow.model.sql"
apis:
  - protocol: rpc
    path: "db.table.pgc_season_follow"
    description:
      zh: >
          权威表 pgc_season_follow（唯一业务写入所有者：W-PGC；RDS 方言与适配器待定）
      en: >
          Authoritative table pgc_season_follow (sole write owner: W-PGC; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/pgc/models/season_follow.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "SeasonFollowRow"
    description: {zh: "追番与提醒", en: "Season follows and reminders"}
    schema: {"type":"object","additionalProperties":false,"description":"追番与提醒 / Season follows and reminders｜存储归属 RDS｜唯一写入所有者 W-PGC｜表 pgc_season_follow；主键 PK(id)；唯一约束 UNIQUE(userId,seasonId)；无二级索引；外键 FK(userId→data.identity.user.id, seasonId→data.pgc.season.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"userId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"seasonId":{"type":"string","description":"外键指向 data.pgc.season.id（多对一，由 RDS 实施） / Foreign key to data.pgc.season.id (many-to-one, enforced by RDS)"},"createdAt":{"type":"string","format":"date-time","description":"createdAt 字段 / Field createdAt"}},"required":["id","userId","seasonId","createdAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "userId→user.id，多对一", en: "userId->user.id, many-to-one"}
  - kind: reference
    to: data.pgc.season
    label: {zh: "seasonId→season.id，多对一", en: "seasonId->season.id,"}
---
