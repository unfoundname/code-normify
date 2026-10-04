---
uid: 54187db2
id: data.channel.album
parent: data.channel
state: planned
tags: [planned, "worker:W-CHANNEL", "storage:rds"]
name: {zh: "音频专辑", en: "Audio album"}
description:
  zh: >
      专辑与曲目顺序
  en: >
      Albums and track ordering
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/content-extra/models/album.model.sql"
apis:
  - protocol: rpc
    path: "db.table.channel_album"
    description:
      zh: >
          权威表 channel_album（唯一业务写入所有者：W-CHANNEL；RDS 方言与适配器待定）
      en: >
          Authoritative table channel_album (sole write owner: W-CHANNEL; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/content-extra/models/album.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "AlbumRow"
    description: {zh: "专辑与曲目顺序", en: "Albums and track ordering"}
    schema: {"type":"object","additionalProperties":false,"description":"专辑与曲目顺序 / Albums and track ordering｜存储归属 RDS｜唯一写入所有者 W-CHANNEL｜表 channel_album；主键 PK(id)；无唯一约束；索引 INDEX(ownerId)；外键 FK(ownerId→data.identity.user.id, coverAssetId→data.media.media-asset.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"ownerId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"title":{"type":"string","description":"title 字段 / Field title"},"coverAssetId":{"type":"string","description":"外键指向 data.media.media-asset.id（多对一，由 RDS 实施） / Foreign key to data.media.media-asset.id (many-to-one, enforced by RDS)"},"trackCount":{"type":"integer","description":"trackCount 字段 / Field trackCount"}},"required":["id","ownerId","title","trackCount"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "ownerId→user.id，多对一", en: "ownerId->user.id, many-to-one"}
  - kind: reference
    to: data.media.media-asset
    label: {zh: "coverAssetId→media-asset.id，多对", en: "coverAssetId->media-asset.id,"}
---
