---
uid: 835f4263
id: data.pgc.episode-schedule
parent: data.pgc
state: planned
tags: [planned, "worker:W-PGC", "storage:rds"]
name: {zh: "剧集排期", en: "Episode schedule"}
description:
  zh: >
      更新时间表与时区
  en: >
      Update timetable with time zone
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/pgc/models/episode_schedule.model.sql"
apis:
  - protocol: rpc
    path: "db.table.pgc_episode_schedule"
    description:
      zh: >
          权威表 pgc_episode_schedule（唯一业务写入所有者：W-PGC；RDS 方言与适配器待定）
      en: >
          Authoritative table pgc_episode_schedule (sole write owner: W-PGC; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/pgc/models/episode_schedule.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "EpisodeScheduleRow"
    description: {zh: "更新时间表与时区", en: "Update timetable with time zone"}
    schema: {"type":"object","additionalProperties":false,"description":"更新时间表与时区 / Update timetable with time zone｜存储归属 RDS｜唯一写入所有者 W-PGC｜表 pgc_episode_schedule；主键 PK(id)；唯一约束 UNIQUE(seasonId,episodeIndex)；无二级索引；外键 FK(seasonId→data.pgc.season.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"seasonId":{"type":"string","description":"外键指向 data.pgc.season.id（多对一，由 RDS 实施） / Foreign key to data.pgc.season.id (many-to-one, enforced by RDS)"},"episodeIndex":{"type":"integer","description":"episodeIndex 字段 / Field episodeIndex"},"publishAt":{"type":"string","format":"date-time","description":"publishAt 字段 / Field publishAt"},"timezone":{"type":"string","description":"timezone 字段 / Field timezone"}},"required":["id","seasonId","episodeIndex","publishAt","timezone"]}
deps:
  - kind: reference
    to: data.pgc.season
    label: {zh: "seasonId→season.id，多对一", en: "seasonId->season.id,"}
---
