---
uid: d4ad9ef5
id: data.live.danmaku-message
parent: data.live
state: planned
tags: [planned, "worker:W-LIVE", "storage:rds"]
name: {zh: "直播弹幕消息", en: "Live danmaku message"}
description:
  zh: >
      实时弹幕消息与序号
  en: >
      Realtime danmaku messages with sequence
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/live/models/danmaku_message.model.sql"
apis:
  - protocol: rpc
    path: "db.table.live_danmaku_message"
    description:
      zh: >
          权威表 live_danmaku_message（唯一业务写入所有者：W-LIVE；RDS 方言与适配器待定）
      en: >
          Authoritative table live_danmaku_message (sole write owner: W-LIVE; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/live/models/danmaku_message.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "DanmakuMessageRow"
    description: {zh: "实时弹幕消息与序号", en: "Realtime danmaku messages with sequence"}
    schema: {"type":"object","additionalProperties":false,"description":"实时弹幕消息与序号 / Realtime danmaku messages with sequence｜存储归属 RDS｜唯一写入所有者 W-LIVE｜表 live_danmaku_message；主键 PK(id)；唯一约束 UNIQUE(roomId,sequence)；索引 INDEX(userId)；外键 FK(roomId→data.live.room.id, userId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"roomId":{"type":"string","description":"外键指向 data.live.room.id（多对一，由 RDS 实施） / Foreign key to data.live.room.id (many-to-one, enforced by RDS)"},"userId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"sequence":{"type":"integer","description":"sequence 字段 / Field sequence"},"text":{"type":"string","description":"text 字段 / Field text"},"sentAt":{"type":"string","format":"date-time","description":"sentAt 字段 / Field sentAt"}},"required":["id","roomId","userId","sequence","text","sentAt"]}
deps:
  - kind: reference
    to: data.live.room
    label: {zh: "roomId→room.id，多对一", en: "roomId->room.id, many-to-one"}
  - kind: reference
    to: data.identity.user
    label: {zh: "userId→user.id，多对一", en: "userId->user.id, many-to-one"}
---
