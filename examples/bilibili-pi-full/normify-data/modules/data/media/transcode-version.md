---
uid: 0f735e20
id: data.media.transcode-version
parent: data.media
state: planned
tags: [planned, "worker:W-MEDIA", "storage:rds"]
name: {zh: "转码版本", en: "Transcode version"}
description:
  zh: >
      某清晰度的产物对象与参数
  en: >
      Artifact object and parameters for one quality tier
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/media/models/transcode_version.model.sql"
apis:
  - protocol: rpc
    path: "db.table.media_transcode_version"
    description:
      zh: >
          权威表 media_transcode_version（唯一业务写入所有者：W-MEDIA；RDS 方言与适配器待定）
      en: >
          Authoritative table media_transcode_version (sole write owner: W-MEDIA; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/media/models/transcode_version.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "TranscodeVersionRow"
    description: {zh: "某清晰度的产物对象与参数", en: "Artifact object and parameters for one quality tier"}
    schema: {"type":"object","additionalProperties":false,"description":"某清晰度的产物对象与参数 / Artifact object and parameters for one quality tier｜存储归属 RDS｜唯一写入所有者 W-MEDIA｜表 media_transcode_version；主键 PK(id)；唯一约束 UNIQUE(assetId,qualityId)；索引 INDEX(objectId)；外键 FK(assetId→data.media.media-asset.id, objectId→data.media.oss-object.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"assetId":{"type":"string","description":"外键指向 data.media.media-asset.id（多对一，由 RDS 实施） / Foreign key to data.media.media-asset.id (many-to-one, enforced by RDS)"},"qualityId":{"type":"string","description":"qualityId 字段 / Field qualityId"},"codec":{"type":"string","description":"codec 字段 / Field codec"},"width":{"type":"integer","description":"width 字段 / Field width"},"height":{"type":"integer","description":"height 字段 / Field height"},"bitrateBps":{"type":"integer","description":"bitrateBps 字段 / Field bitrateBps"},"objectId":{"type":"string","description":"外键指向 data.media.oss-object.id（多对一，由 RDS 实施） / Foreign key to data.media.oss-object.id (many-to-one, enforced by RDS)"},"createdAt":{"type":"string","format":"date-time","description":"createdAt 字段 / Field createdAt"}},"required":["id","assetId","qualityId","codec","width","height","bitrateBps","objectId","createdAt"]}
deps:
  - kind: reference
    to: data.media.media-asset
    label: {zh: "assetId→media-asset.id，多对一", en: "assetId->media-asset.id,"}
  - kind: reference
    to: data.media.oss-object
    label: {zh: "objectId→oss-object.id，多对一", en: "objectId->oss-object.id,"}
---
