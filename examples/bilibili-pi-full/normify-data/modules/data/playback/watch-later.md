---
uid: 1da11665
id: data.playback.watch-later
parent: data.playback
state: planned
tags: [planned, "worker:W-PLAYBACK", "storage:rds"]
name: {zh: "稍后再看", en: "Watch later"}
description:
  zh: >
      稍后再看条目与顺序
  en: >
      Watch later items and ordering
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/media/models/watch_later.model.sql"
apis:
  - protocol: rpc
    path: "db.table.playback_watch_later"
    description:
      zh: >
          权威表 playback_watch_later（唯一业务写入所有者：W-PLAYBACK；RDS 方言与适配器待定）
      en: >
          Authoritative table playback_watch_later (sole write owner: W-PLAYBACK; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/media/models/watch_later.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "WatchLaterRow"
    description: {zh: "稍后再看条目与顺序", en: "Watch later items and ordering"}
    schema: {"type":"object","additionalProperties":false,"description":"稍后再看条目与顺序 / Watch later items and ordering｜存储归属 RDS｜唯一写入所有者 W-PLAYBACK｜表 playback_watch_later；主键 PK(id)；唯一约束 UNIQUE(userId,bvid)；索引 INDEX(orderIndex)；外键 FK(userId→data.identity.user.id, bvid→data.content.video.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"userId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"bvid":{"type":"string","description":"外键指向 data.content.video.id（多对一，由 RDS 实施） / Foreign key to data.content.video.id (many-to-one, enforced by RDS)"},"orderIndex":{"type":"integer","description":"orderIndex 字段 / Field orderIndex"},"addedAt":{"type":"string","format":"date-time","description":"addedAt 字段 / Field addedAt"}},"required":["id","userId","bvid","orderIndex","addedAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "userId→user.id，多对一", en: "userId->user.id, many-to-one"}
  - kind: reference
    to: data.content.video
    label: {zh: "bvid→video.id，多对一", en: "bvid->video.id, many-to-one"}
---
