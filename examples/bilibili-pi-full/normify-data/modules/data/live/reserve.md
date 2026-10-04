---
uid: c3a9f722
id: data.live.reserve
parent: data.live
state: planned
tags: [planned, "worker:W-LIVE", "storage:rds"]
name: {zh: "直播预约", en: "Live reservation"}
description:
  zh: >
      预约与提醒时间
  en: >
      Reservations and reminder timing
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/live/models/reserve.model.sql"
apis:
  - protocol: rpc
    path: "db.table.live_reserve"
    description:
      zh: >
          权威表 live_reserve（唯一业务写入所有者：W-LIVE；RDS 方言与适配器待定）
      en: >
          Authoritative table live_reserve (sole write owner: W-LIVE; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/live/models/reserve.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "ReserveRow"
    description: {zh: "预约与提醒时间", en: "Reservations and reminder timing"}
    schema: {"type":"object","additionalProperties":false,"description":"预约与提醒时间 / Reservations and reminder timing｜存储归属 RDS｜唯一写入所有者 W-LIVE｜表 live_reserve；主键 PK(id)；唯一约束 UNIQUE(userId,roomId)；无二级索引；外键 FK(userId→data.identity.user.id, roomId→data.live.room.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"userId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"roomId":{"type":"string","description":"外键指向 data.live.room.id（多对一，由 RDS 实施） / Foreign key to data.live.room.id (many-to-one, enforced by RDS)"},"notifyBeforeSec":{"type":"integer","description":"notifyBeforeSec 字段 / Field notifyBeforeSec"},"createdAt":{"type":"string","format":"date-time","description":"createdAt 字段 / Field createdAt"}},"required":["id","userId","roomId","notifyBeforeSec","createdAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "userId→user.id，多对一", en: "userId->user.id, many-to-one"}
  - kind: reference
    to: data.live.room
    label: {zh: "roomId→room.id，多对一", en: "roomId->room.id, many-to-one"}
---
