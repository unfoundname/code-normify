---
uid: 4fe87c1f
id: data.danmaku.danmaku-moderation
parent: data.danmaku
state: planned
tags: [planned, "worker:W-DANMAKU", "storage:rds"]
name: {zh: "弹幕管理动作", en: "Danmaku moderation action"}
description:
  zh: >
      UP 主管理动作与操作者
  en: >
      Uploader moderation actions and operators
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/community/models/danmaku_moderation.model.sql"
apis:
  - protocol: rpc
    path: "db.table.danmaku_moderation"
    description:
      zh: >
          权威表 danmaku_moderation（唯一业务写入所有者：W-DANMAKU；RDS 方言与适配器待定）
      en: >
          Authoritative table danmaku_moderation (sole write owner: W-DANMAKU; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/community/models/danmaku_moderation.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "DanmakuModerationRow"
    description: {zh: "UP 主管理动作与操作者", en: "Uploader moderation actions and operators"}
    schema: {"type":"object","additionalProperties":false,"description":"UP 主管理动作与操作者 / Uploader moderation actions and operators｜存储归属 RDS｜唯一写入所有者 W-DANMAKU｜表 danmaku_moderation；主键 PK(id)；无唯一约束；索引 INDEX(bvid,createdAt)；外键 FK(danmakuId→data.danmaku.danmaku-item.id, bvid→data.content.video.id, operatorId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"danmakuId":{"type":"string","description":"外键指向 data.danmaku.danmaku-item.id（多对一，由 RDS 实施） / Foreign key to data.danmaku.danmaku-item.id (many-to-one, enforced by RDS)"},"bvid":{"type":"string","description":"外键指向 data.content.video.id（多对一，由 RDS 实施） / Foreign key to data.content.video.id (many-to-one, enforced by RDS)"},"action":{"type":"string","description":"action 字段 / Field action"},"operatorId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"createdAt":{"type":"string","format":"date-time","description":"createdAt 字段 / Field createdAt"}},"required":["id","danmakuId","bvid","action","operatorId","createdAt"]}
deps:
  - kind: reference
    to: data.danmaku.danmaku-item
    label: {zh: "danmakuId→danmaku-item.id，多对一", en: "danmakuId->danmaku-item.id,"}
  - kind: reference
    to: data.content.video
    label: {zh: "bvid→video.id，多对一", en: "bvid->video.id, many-to-one"}
  - kind: reference
    to: data.identity.user
    label: {zh: "operatorId→user.id，多对一", en: "operatorId->user.id,"}
---
