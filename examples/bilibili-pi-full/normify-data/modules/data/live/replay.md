---
uid: fde0032b
id: data.live.replay
parent: data.live
state: planned
tags: [planned, "worker:W-LIVE", "storage:rds"]
name: {zh: "直播回放", en: "Live replay"}
description:
  zh: >
      回放资源与来源房间
  en: >
      Replay assets and their source room
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/live/models/replay.model.sql"
apis:
  - protocol: rpc
    path: "db.table.live_replay"
    description:
      zh: >
          权威表 live_replay（唯一业务写入所有者：W-LIVE；RDS 方言与适配器待定）
      en: >
          Authoritative table live_replay (sole write owner: W-LIVE; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/live/models/replay.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "ReplayRow"
    description: {zh: "回放资源与来源房间", en: "Replay assets and their source room"}
    schema: {"type":"object","additionalProperties":false,"description":"回放资源与来源房间 / Replay assets and their source room｜存储归属 RDS｜唯一写入所有者 W-LIVE｜表 live_replay；主键 PK(id)；无唯一约束；索引 INDEX(roomId,startedAt)；外键 FK(roomId→data.live.room.id, assetId→data.media.media-asset.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"roomId":{"type":"string","description":"外键指向 data.live.room.id（多对一，由 RDS 实施） / Foreign key to data.live.room.id (many-to-one, enforced by RDS)"},"assetId":{"type":"string","description":"外键指向 data.media.media-asset.id（多对一，由 RDS 实施） / Foreign key to data.media.media-asset.id (many-to-one, enforced by RDS)"},"startedAt":{"type":"string","format":"date-time","description":"startedAt 字段 / Field startedAt"},"durationMs":{"type":"integer","description":"durationMs 字段 / Field durationMs"},"publishedBvid":{"type":"string","description":"publishedBvid 字段 / Field publishedBvid"}},"required":["id","roomId","assetId","startedAt","durationMs"]}
deps:
  - kind: reference
    to: data.live.room
    label: {zh: "roomId→room.id，多对一", en: "roomId->room.id, many-to-one"}
  - kind: reference
    to: data.media.media-asset
    label: {zh: "assetId→media-asset.id，多对一", en: "assetId->media-asset.id,"}
---
