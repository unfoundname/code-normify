---
uid: e1c5e20b
id: data.live.room
parent: data.live
state: planned
tags: [planned, "worker:W-LIVE", "storage:rds"]
name: {zh: "直播间", en: "Live room"}
description:
  zh: >
      房间信息、分区与开播状态
  en: >
      Room metadata, category and live state
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/live/models/room.model.sql"
apis:
  - protocol: rpc
    path: "db.table.live_room"
    description:
      zh: >
          权威表 live_room（唯一业务写入所有者：W-LIVE；RDS 方言与适配器待定）
      en: >
          Authoritative table live_room (sole write owner: W-LIVE; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/live/models/room.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "RoomRow"
    description: {zh: "房间信息、分区与开播状态", en: "Room metadata, category and live state"}
    schema: {"type":"object","additionalProperties":false,"description":"房间信息、分区与开播状态 / Room metadata, category and live state｜存储归属 RDS｜唯一写入所有者 W-LIVE｜表 live_room；主键 PK(id)；无唯一约束；索引 INDEX(ownerId,status)；外键 FK(ownerId→data.identity.user.id, partitionId→data.content.partition.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"ownerId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"title":{"type":"string","description":"title 字段 / Field title"},"coverUrl":{"type":"string","description":"coverUrl 字段 / Field coverUrl"},"partitionId":{"type":"string","description":"外键指向 data.content.partition.id（多对一，由 RDS 实施） / Foreign key to data.content.partition.id (many-to-one, enforced by RDS)"},"status":{"type":"string","enum":["OFFLINE","PREPARING","LIVE","BANNED"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"viewerCount":{"type":"integer","description":"viewerCount 字段 / Field viewerCount"},"updatedAt":{"type":"string","format":"date-time","description":"updatedAt 字段 / Field updatedAt"}},"required":["id","ownerId","title","coverUrl","partitionId","status","viewerCount","updatedAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "ownerId→user.id，多对一", en: "ownerId->user.id, many-to-one"}
  - kind: reference
    to: data.content.partition
    label: {zh: "partitionId→partition.id，多对一", en: "partitionId->partition.id,"}
---
