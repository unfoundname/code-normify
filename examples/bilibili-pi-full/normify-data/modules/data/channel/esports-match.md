---
uid: 76ae103d
id: data.channel.esports-match
parent: data.channel
state: planned
tags: [planned, "worker:W-CHANNEL", "storage:rds"]
name: {zh: "电竞赛事", en: "Esports match"}
description:
  zh: >
      赛事、赛程与直播绑定
  en: >
      Tournaments, schedules and live binding
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/content-extra/models/esports_match.model.sql"
apis:
  - protocol: rpc
    path: "db.table.channel_esports_match"
    description:
      zh: >
          权威表 channel_esports_match（唯一业务写入所有者：W-CHANNEL；RDS 方言与适配器待定）
      en: >
          Authoritative table channel_esports_match (sole write owner: W-CHANNEL; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/content-extra/models/esports_match.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "EsportsMatchRow"
    description: {zh: "赛事、赛程与直播绑定", en: "Tournaments, schedules and live binding"}
    schema: {"type":"object","additionalProperties":false,"description":"赛事、赛程与直播绑定 / Tournaments, schedules and live binding｜存储归属 RDS｜唯一写入所有者 W-CHANNEL｜表 channel_esports_match；主键 PK(id)；无唯一约束；索引 INDEX(startAt,status)；外键 FK(roomId→data.live.room.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"gameId":{"type":"string","description":"gameId 字段 / Field gameId"},"title":{"type":"string","description":"title 字段 / Field title"},"startAt":{"type":"string","format":"date-time","description":"startAt 字段 / Field startAt"},"status":{"type":"string","enum":["SCHEDULED","LIVE","FINISHED"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"roomId":{"type":"string","description":"外键指向 data.live.room.id（多对一，由 RDS 实施） / Foreign key to data.live.room.id (many-to-one, enforced by RDS)"}},"required":["id","gameId","title","startAt","status"]}
deps:
  - kind: reference
    to: data.live.room
    label: {zh: "roomId→room.id，多对一", en: "roomId->room.id, many-to-one"}
---
