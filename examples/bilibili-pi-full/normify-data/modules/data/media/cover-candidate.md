---
uid: 2f8e4ad1
id: data.media.cover-candidate
parent: data.media
state: planned
tags: [planned, "worker:W-MEDIA", "storage:rds"]
name: {zh: "封面候选", en: "Cover candidate"}
description:
  zh: >
      抽帧候选与选定标记
  en: >
      Frame candidates and the selection flag
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/media/models/cover_candidate.model.sql"
apis:
  - protocol: rpc
    path: "db.table.media_cover_candidate"
    description:
      zh: >
          权威表 media_cover_candidate（唯一业务写入所有者：W-MEDIA；RDS 方言与适配器待定）
      en: >
          Authoritative table media_cover_candidate (sole write owner: W-MEDIA; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/media/models/cover_candidate.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "CoverCandidateRow"
    description: {zh: "抽帧候选与选定标记", en: "Frame candidates and the selection flag"}
    schema: {"type":"object","additionalProperties":false,"description":"抽帧候选与选定标记 / Frame candidates and the selection flag｜存储归属 RDS｜唯一写入所有者 W-MEDIA｜表 media_cover_candidate；主键 PK(id)；无唯一约束；索引 INDEX(assetId,selected)；外键 FK(assetId→data.media.media-asset.id, objectId→data.media.oss-object.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"assetId":{"type":"string","description":"外键指向 data.media.media-asset.id（多对一，由 RDS 实施） / Foreign key to data.media.media-asset.id (many-to-one, enforced by RDS)"},"objectId":{"type":"string","description":"外键指向 data.media.oss-object.id（多对一，由 RDS 实施） / Foreign key to data.media.oss-object.id (many-to-one, enforced by RDS)"},"positionMs":{"type":"integer","description":"positionMs 字段 / Field positionMs"},"selected":{"type":"boolean","description":"selected 字段 / Field selected"}},"required":["id","assetId","objectId","positionMs","selected"]}
deps:
  - kind: reference
    to: data.media.media-asset
    label: {zh: "assetId→media-asset.id，多对一", en: "assetId->media-asset.id,"}
  - kind: reference
    to: data.media.oss-object
    label: {zh: "objectId→oss-object.id，多对一", en: "objectId->oss-object.id,"}
---
