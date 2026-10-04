---
uid: 084b6414
id: data.live.ingest-endpoint
parent: data.live
state: planned
tags: [planned, "worker:W-LIVE", "storage:rds"]
name: {zh: "推流端点", en: "Ingest endpoint"}
description:
  zh: >
      推流地址与密钥引用（不落明文）
  en: >
      Ingest url and secret reference, never plaintext
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/live/models/ingest_endpoint.model.sql"
apis:
  - protocol: rpc
    path: "db.table.live_ingest_endpoint"
    description:
      zh: >
          权威表 live_ingest_endpoint（唯一业务写入所有者：W-LIVE；RDS 方言与适配器待定）
      en: >
          Authoritative table live_ingest_endpoint (sole write owner: W-LIVE; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/live/models/ingest_endpoint.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "IngestEndpointRow"
    description: {zh: "推流地址与密钥引用（不落明文）", en: "Ingest url and secret reference, never plaintext"}
    schema: {"type":"object","additionalProperties":false,"description":"推流地址与密钥引用（不落明文） / Ingest url and secret reference, never plaintext｜存储归属 RDS｜唯一写入所有者 W-LIVE｜表 live_ingest_endpoint；主键 PK(id)；无唯一约束；索引 INDEX(roomId,expireAt)；外键 FK(roomId→data.live.room.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"roomId":{"type":"string","description":"外键指向 data.live.room.id（多对一，由 RDS 实施） / Foreign key to data.live.room.id (many-to-one, enforced by RDS)"},"rtmpUrl":{"type":"string","description":"rtmpUrl 字段 / Field rtmpUrl"},"streamKeyRef":{"type":"string","description":"streamKeyRef 字段 / Field streamKeyRef"},"expireAt":{"type":"string","format":"date-time","description":"expireAt 字段 / Field expireAt"},"createdAt":{"type":"string","format":"date-time","description":"createdAt 字段 / Field createdAt"}},"required":["id","roomId","rtmpUrl","streamKeyRef","expireAt","createdAt"]}
deps:
  - kind: reference
    to: data.live.room
    label: {zh: "roomId→room.id，多对一", en: "roomId->room.id, many-to-one"}
---
