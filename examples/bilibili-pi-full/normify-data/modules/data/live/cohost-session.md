---
uid: eec60ea5
id: data.live.cohost-session
parent: data.live
state: planned
tags: [planned, "worker:W-LIVE", "storage:rds"]
name: {zh: "连麦会话", en: "Co-host session"}
description:
  zh: >
      连麦双方、状态与 RTC 凭据引用
  en: >
      Co-host parties, state and RTC credential references
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/live/models/cohost_session.model.sql"
apis:
  - protocol: rpc
    path: "db.table.live_cohost_session"
    description:
      zh: >
          权威表 live_cohost_session（唯一业务写入所有者：W-LIVE；RDS 方言与适配器待定）
      en: >
          Authoritative table live_cohost_session (sole write owner: W-LIVE; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/live/models/cohost_session.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "CohostSessionRow"
    description: {zh: "连麦双方、状态与 RTC 凭据引用", en: "Co-host parties, state and RTC credential references"}
    schema: {"type":"object","additionalProperties":false,"description":"连麦双方、状态与 RTC 凭据引用 / Co-host parties, state and RTC credential references｜存储归属 RDS｜唯一写入所有者 W-LIVE｜表 live_cohost_session；主键 PK(id)；无唯一约束；索引 INDEX(hostRoomId,status)；外键 FK(hostRoomId→data.live.room.id, guestRoomId→data.live.room.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"hostRoomId":{"type":"string","description":"外键指向 data.live.room.id（多对一，由 RDS 实施） / Foreign key to data.live.room.id (many-to-one, enforced by RDS)"},"guestRoomId":{"type":"string","description":"外键指向 data.live.room.id（多对一，由 RDS 实施） / Foreign key to data.live.room.id (many-to-one, enforced by RDS)"},"status":{"type":"string","enum":["INVITING","ACTIVE","ENDED"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"rtcTokenRef":{"type":"string","description":"rtcTokenRef 字段 / Field rtcTokenRef"},"startedAt":{"type":"string","format":"date-time","description":"startedAt 字段 / Field startedAt"}},"required":["id","hostRoomId","guestRoomId","status"]}
deps:
  - kind: reference
    to: data.live.room
    label: {zh: "hostRoomId→room.id+guestRoomId", en: "hostRoomId->room.id+guestRoomI"}
---
