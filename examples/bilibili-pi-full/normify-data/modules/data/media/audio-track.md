---
uid: cba92736
id: data.media.audio-track
parent: data.media
state: planned
tags: [planned, "worker:W-MEDIA", "storage:rds"]
name: {zh: "音轨", en: "Audio track"}
description:
  zh: >
      多音轨元数据与默认轨标记
  en: >
      Multi-track metadata and the default track flag
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/media/models/audio_track.model.sql"
apis:
  - protocol: rpc
    path: "db.table.media_audio_track"
    description:
      zh: >
          权威表 media_audio_track（唯一业务写入所有者：W-MEDIA；RDS 方言与适配器待定）
      en: >
          Authoritative table media_audio_track (sole write owner: W-MEDIA; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/media/models/audio_track.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "AudioTrackRow"
    description: {zh: "多音轨元数据与默认轨标记", en: "Multi-track metadata and the default track flag"}
    schema: {"type":"object","additionalProperties":false,"description":"多音轨元数据与默认轨标记 / Multi-track metadata and the default track flag｜存储归属 RDS｜唯一写入所有者 W-MEDIA｜表 media_audio_track；主键 PK(id)；无唯一约束；索引 INDEX(assetId)；外键 FK(assetId→data.media.media-asset.id, objectId→data.media.oss-object.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"assetId":{"type":"string","description":"外键指向 data.media.media-asset.id（多对一，由 RDS 实施） / Foreign key to data.media.media-asset.id (many-to-one, enforced by RDS)"},"objectId":{"type":"string","description":"外键指向 data.media.oss-object.id（多对一，由 RDS 实施） / Foreign key to data.media.oss-object.id (many-to-one, enforced by RDS)"},"language":{"type":"string","description":"language 字段 / Field language"},"codec":{"type":"string","description":"codec 字段 / Field codec"},"bitrateBps":{"type":"integer","description":"bitrateBps 字段 / Field bitrateBps"},"defaultTrack":{"type":"boolean","description":"defaultTrack 字段 / Field defaultTrack"}},"required":["id","assetId","objectId","language","codec","bitrateBps","defaultTrack"]}
deps:
  - kind: reference
    to: data.media.media-asset
    label: {zh: "assetId→media-asset.id，多对一", en: "assetId->media-asset.id,"}
  - kind: reference
    to: data.media.oss-object
    label: {zh: "objectId→oss-object.id，多对一", en: "objectId->oss-object.id,"}
---
