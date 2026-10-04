---
uid: 05da4476
id: data.media.subtitle-track
parent: data.media
state: planned
tags: [planned, "worker:W-MEDIA", "storage:rds"]
name: {zh: "字幕轨", en: "Subtitle track"}
description:
  zh: >
      字幕语言、格式与对象
  en: >
      Subtitle language, format and object
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/media/models/subtitle_track.model.sql"
apis:
  - protocol: rpc
    path: "db.table.media_subtitle_track"
    description:
      zh: >
          权威表 media_subtitle_track（唯一业务写入所有者：W-MEDIA；RDS 方言与适配器待定）
      en: >
          Authoritative table media_subtitle_track (sole write owner: W-MEDIA; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/media/models/subtitle_track.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "SubtitleTrackRow"
    description: {zh: "字幕语言、格式与对象", en: "Subtitle language, format and object"}
    schema: {"type":"object","additionalProperties":false,"description":"字幕语言、格式与对象 / Subtitle language, format and object｜存储归属 RDS｜唯一写入所有者 W-MEDIA｜表 media_subtitle_track；主键 PK(id)；无唯一约束；索引 INDEX(assetId,language)；外键 FK(assetId→data.media.media-asset.id, objectId→data.media.oss-object.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"assetId":{"type":"string","description":"外键指向 data.media.media-asset.id（多对一，由 RDS 实施） / Foreign key to data.media.media-asset.id (many-to-one, enforced by RDS)"},"objectId":{"type":"string","description":"外键指向 data.media.oss-object.id（多对一，由 RDS 实施） / Foreign key to data.media.oss-object.id (many-to-one, enforced by RDS)"},"language":{"type":"string","description":"language 字段 / Field language"},"format":{"type":"string","description":"format 字段 / Field format"},"source":{"type":"string","description":"source 字段 / Field source"},"reviewed":{"type":"boolean","description":"reviewed 字段 / Field reviewed"}},"required":["id","assetId","objectId","language","format","source","reviewed"]}
deps:
  - kind: reference
    to: data.media.media-asset
    label: {zh: "assetId→media-asset.id，多对一", en: "assetId->media-asset.id,"}
  - kind: reference
    to: data.media.oss-object
    label: {zh: "objectId→oss-object.id，多对一", en: "objectId->oss-object.id,"}
---
