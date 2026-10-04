---
uid: 5a0501d3
id: data.media.media-asset
parent: data.media
state: planned
tags: [planned, "worker:W-MEDIA", "storage:rds"]
name: {zh: "媒体资源", en: "Media asset"}
description:
  zh: >
      原件逻辑资源：所有者、处理状态与内容指纹
  en: >
      Logical original asset with owner, processing state and content fingerprint
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/media/models/media_asset.model.sql"
apis:
  - protocol: rpc
    path: "db.table.media_asset"
    description:
      zh: >
          权威表 media_asset（唯一业务写入所有者：W-MEDIA；RDS 方言与适配器待定）
      en: >
          Authoritative table media_asset (sole write owner: W-MEDIA; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/media/models/media_asset.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "MediaAssetRow"
    description: {zh: "原件逻辑资源：所有者、处理状态与内容指纹", en: "Logical original asset with owner, processing state and content fingerprint"}
    schema: {"type":"object","additionalProperties":false,"description":"原件逻辑资源：所有者、处理状态与内容指纹 / Logical original asset with owner, processing state and content fingerprint｜存储归属 RDS｜唯一写入所有者 W-MEDIA｜表 media_asset；主键 PK(id)；唯一约束 UNIQUE(sha256,ownerId)；索引 INDEX(mediaState), INDEX(quarantinedFromAssetId)；外键 FK(ownerId→data.identity.user.id, originalObjectId→data.media.oss-object.id, quarantinedFromAssetId→data.media.media-asset.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"ownerId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"originalObjectId":{"type":"string","description":"外键指向 data.media.oss-object.id（多对一，由 RDS 实施） / Foreign key to data.media.oss-object.id (many-to-one, enforced by RDS)"},"durationMs":{"type":"integer","description":"durationMs 字段 / Field durationMs"},"sha256":{"type":"string","description":"sha256 字段 / Field sha256"},"mediaState":{"type":"string","enum":["UPLOADED","PROBING","TRANSCODING","READY","FAILED","QUARANTINED"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"quarantineReason":{"type":"string","description":"quarantineReason 字段 / Field quarantineReason"},"createdAt":{"type":"string","format":"date-time","description":"createdAt 字段 / Field createdAt"},"quarantinedFromAssetId":{"type":"string","description":"外键指向 data.media.media-asset.id（多对一，由 RDS 实施） / Foreign key to data.media.media-asset.id (many-to-one, enforced by RDS)"}},"required":["id","ownerId","originalObjectId","sha256","mediaState","createdAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "ownerId→user.id，多对一", en: "ownerId->user.id, many-to-one"}
  - kind: reference
    to: data.media.oss-object
    label: {zh: "originalObjectId→oss-object.id", en: "originalObjectId->oss-object.i"}
---
