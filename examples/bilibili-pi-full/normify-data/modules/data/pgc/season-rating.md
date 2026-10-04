---
uid: f8a97f89
id: data.pgc.season-rating
parent: data.pgc
state: planned
tags: [planned, "worker:W-PGC", "storage:rds"]
name: {zh: "季度评分", en: "Season rating"}
description:
  zh: >
      评分与长评引用
  en: >
      Ratings and long review references
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/pgc/models/season_rating.model.sql"
apis:
  - protocol: rpc
    path: "db.table.pgc_season_rating"
    description:
      zh: >
          权威表 pgc_season_rating（唯一业务写入所有者：W-PGC；RDS 方言与适配器待定）
      en: >
          Authoritative table pgc_season_rating (sole write owner: W-PGC; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/pgc/models/season_rating.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "SeasonRatingRow"
    description: {zh: "评分与长评引用", en: "Ratings and long review references"}
    schema: {"type":"object","additionalProperties":false,"description":"评分与长评引用 / Ratings and long review references｜存储归属 RDS｜唯一写入所有者 W-PGC｜表 pgc_season_rating；主键 PK(id)；唯一约束 UNIQUE(seasonId,userId)；无二级索引；外键 FK(seasonId→data.pgc.season.id, userId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"seasonId":{"type":"string","description":"外键指向 data.pgc.season.id（多对一，由 RDS 实施） / Foreign key to data.pgc.season.id (many-to-one, enforced by RDS)"},"userId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"score":{"type":"integer","description":"score 字段 / Field score"},"reviewId":{"type":"string","description":"reviewId 字段 / Field reviewId"},"createdAt":{"type":"string","format":"date-time","description":"createdAt 字段 / Field createdAt"}},"required":["id","seasonId","userId","score","createdAt"]}
deps:
  - kind: reference
    to: data.pgc.season
    label: {zh: "seasonId→season.id，多对一", en: "seasonId->season.id,"}
  - kind: reference
    to: data.identity.user
    label: {zh: "userId→user.id，多对一", en: "userId->user.id, many-to-one"}
---
