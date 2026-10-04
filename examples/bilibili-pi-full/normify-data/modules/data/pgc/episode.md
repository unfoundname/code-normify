---
uid: 4f8c3275
id: data.pgc.episode
parent: data.pgc
state: planned
tags: [planned, "worker:W-PGC", "storage:rds"]
name: {zh: "剧集", en: "Episode"}
description:
  zh: >
      剧集序号、视频映射与试看
  en: >
      Episode index, video mapping and trial
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/pgc/models/episode.model.sql"
apis:
  - protocol: rpc
    path: "db.table.pgc_episode"
    description:
      zh: >
          权威表 pgc_episode（唯一业务写入所有者：W-PGC；RDS 方言与适配器待定）
      en: >
          Authoritative table pgc_episode (sole write owner: W-PGC; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/pgc/models/episode.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "EpisodeRow"
    description: {zh: "剧集序号、视频映射与试看", en: "Episode index, video mapping and trial"}
    schema: {"type":"object","additionalProperties":false,"description":"剧集序号、视频映射与试看 / Episode index, video mapping and trial｜存储归属 RDS｜唯一写入所有者 W-PGC｜表 pgc_episode；主键 PK(id)；唯一约束 UNIQUE(seasonId,index)；索引 INDEX(bvid)；外键 FK(seasonId→data.pgc.season.id, bvid→data.content.video.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"seasonId":{"type":"string","description":"外键指向 data.pgc.season.id（多对一，由 RDS 实施） / Foreign key to data.pgc.season.id (many-to-one, enforced by RDS)"},"index":{"type":"integer","description":"index 字段 / Field index"},"title":{"type":"string","description":"title 字段 / Field title"},"bvid":{"type":"string","description":"外键指向 data.content.video.id（多对一，由 RDS 实施） / Foreign key to data.content.video.id (many-to-one, enforced by RDS)"},"durationMs":{"type":"integer","description":"durationMs 字段 / Field durationMs"},"trialSec":{"type":"integer","description":"trialSec 字段 / Field trialSec"},"publishAt":{"type":"string","format":"date-time","description":"publishAt 字段 / Field publishAt"}},"required":["id","seasonId","index","title","durationMs"]}
deps:
  - kind: reference
    to: data.pgc.season
    label: {zh: "seasonId→season.id，多对一", en: "seasonId->season.id,"}
  - kind: reference
    to: data.content.video
    label: {zh: "bvid→video.id，多对一", en: "bvid->video.id, many-to-one"}
---
