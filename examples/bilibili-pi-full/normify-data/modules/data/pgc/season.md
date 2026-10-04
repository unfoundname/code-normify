---
uid: 03565e9f
id: data.pgc.season
parent: data.pgc
state: planned
tags: [planned, "worker:W-PGC", "storage:rds"]
name: {zh: "季度", en: "Season"}
description:
  zh: >
      番剧/影视季度与类型
  en: >
      Anime, film and TV seasons with kinds
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/pgc/models/season.model.sql"
apis:
  - protocol: rpc
    path: "db.table.pgc_season"
    description:
      zh: >
          权威表 pgc_season（唯一业务写入所有者：W-PGC；RDS 方言与适配器待定）
      en: >
          Authoritative table pgc_season (sole write owner: W-PGC; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/pgc/models/season.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "SeasonRow"
    description: {zh: "番剧/影视季度与类型", en: "Anime, film and TV seasons with kinds"}
    schema: {"type":"object","additionalProperties":false,"description":"番剧/影视季度与类型 / Anime, film and TV seasons with kinds｜存储归属 RDS｜唯一写入所有者 W-PGC｜表 pgc_season；主键 PK(id)；无唯一约束；索引 INDEX(kind,updatedAt)；外键 FK(licenseId→data.pgc.license-window.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"title":{"type":"string","description":"title 字段 / Field title"},"kind":{"type":"string","enum":["ANIME","DOMESTIC","FILM","TV","DOCUMENTARY"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"licenseId":{"type":"string","description":"外键指向 data.pgc.license-window.id（多对一，由 RDS 实施） / Foreign key to data.pgc.license-window.id (many-to-one, enforced by RDS)"},"episodeCount":{"type":"integer","description":"episodeCount 字段 / Field episodeCount"},"followCount":{"type":"integer","description":"followCount 字段 / Field followCount"},"scoreAvg":{"type":"number","description":"scoreAvg 字段 / Field scoreAvg"},"updatedAt":{"type":"string","format":"date-time","description":"updatedAt 字段 / Field updatedAt"}},"required":["id","title","kind","licenseId","episodeCount","followCount","scoreAvg","updatedAt"]}
deps:
  - kind: reference
    to: data.pgc.license-window
    label: {zh: "licenseId→license-window.id，多对", en: "licenseId->license-window.id,"}
---
