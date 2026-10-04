---
uid: 8c99eb2f
id: data.playback.watch-history
parent: data.playback
state: planned
tags: [planned, "worker:W-PLAYBACK", "storage:rds"]
name: {zh: "观看历史", en: "Watch history"}
description:
  zh: >
      历史条目与去重键
  en: >
      History entries and their dedupe key
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/media/models/watch_history.model.sql"
apis:
  - protocol: rpc
    path: "db.table.playback_watch_history"
    description:
      zh: >
          权威表 playback_watch_history（唯一业务写入所有者：W-PLAYBACK；RDS 方言与适配器待定）
      en: >
          Authoritative table playback_watch_history (sole write owner: W-PLAYBACK; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/media/models/watch_history.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "WatchHistoryRow"
    description: {zh: "历史条目与去重键", en: "History entries and their dedupe key"}
    schema: {"type":"object","additionalProperties":false,"description":"历史条目与去重键 / History entries and their dedupe key｜存储归属 RDS｜唯一写入所有者 W-PLAYBACK｜表 playback_watch_history；主键 PK(id)；唯一约束 UNIQUE(userId,bvid,deviceId)；索引 INDEX(watchedAt)；外键 FK(userId→data.identity.user.id, bvid→data.content.video.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"userId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"bvid":{"type":"string","description":"外键指向 data.content.video.id（多对一，由 RDS 实施） / Foreign key to data.content.video.id (many-to-one, enforced by RDS)"},"progressMs":{"type":"integer","description":"progressMs 字段 / Field progressMs"},"watchedAt":{"type":"string","format":"date-time","description":"watchedAt 字段 / Field watchedAt"},"deviceId":{"type":"string","description":"deviceId 字段 / Field deviceId"}},"required":["id","userId","bvid","progressMs","watchedAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "userId→user.id，多对一", en: "userId->user.id, many-to-one"}
  - kind: reference
    to: data.content.video
    label: {zh: "bvid→video.id，多对一", en: "bvid->video.id, many-to-one"}
---
