---
uid: 2c1ad6df
id: data.playback.play-progress
parent: data.playback
state: planned
tags: [planned, "worker:W-PLAYBACK", "storage:rds"]
name: {zh: "播放进度", en: "Playback progress"}
description:
  zh: >
      用户进度与完成度
  en: >
      User progress and completion state
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/media/models/play_progress.model.sql"
apis:
  - protocol: rpc
    path: "db.table.playback_progress"
    description:
      zh: >
          权威表 playback_progress（唯一业务写入所有者：W-PLAYBACK；RDS 方言与适配器待定）
      en: >
          Authoritative table playback_progress (sole write owner: W-PLAYBACK; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/media/models/play_progress.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "PlayProgressRow"
    description: {zh: "用户进度与完成度", en: "User progress and completion state"}
    schema: {"type":"object","additionalProperties":false,"description":"用户进度与完成度 / User progress and completion state｜存储归属 RDS｜唯一写入所有者 W-PLAYBACK｜表 playback_progress；主键 PK(id)；唯一约束 UNIQUE(userId,bvid)；索引 INDEX(updatedAt)；外键 FK(userId→data.identity.user.id, bvid→data.content.video.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"userId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"bvid":{"type":"string","description":"外键指向 data.content.video.id（多对一，由 RDS 实施） / Foreign key to data.content.video.id (many-to-one, enforced by RDS)"},"progressMs":{"type":"integer","description":"progressMs 字段 / Field progressMs"},"finished":{"type":"boolean","description":"finished 字段 / Field finished"},"deviceId":{"type":"string","description":"deviceId 字段 / Field deviceId"},"updatedAt":{"type":"string","format":"date-time","description":"updatedAt 字段 / Field updatedAt"}},"required":["id","userId","bvid","progressMs","finished","updatedAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "userId→user.id，多对一", en: "userId->user.id, many-to-one"}
  - kind: reference
    to: data.content.video
    label: {zh: "bvid→video.id，多对一", en: "bvid->video.id, many-to-one"}
---
