---
uid: cf0b1362
id: data.content.video-draft
parent: data.content
state: planned
tags: [planned, "worker:W-CONTENT", "storage:rds"]
name: {zh: "稿件草稿", en: "Video draft"}
description:
  zh: >
      草稿元数据、可见性与提交状态
  en: >
      Draft metadata, visibility and submission state
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/content/models/video_draft.model.sql"
apis:
  - protocol: rpc
    path: "db.table.content_video_draft"
    description:
      zh: >
          权威表 content_video_draft（唯一业务写入所有者：W-CONTENT；RDS 方言与适配器待定）
      en: >
          Authoritative table content_video_draft (sole write owner: W-CONTENT; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/content/models/video_draft.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "VideoDraftRow"
    description: {zh: "草稿元数据、可见性与提交状态", en: "Draft metadata, visibility and submission state"}
    schema: {"type":"object","additionalProperties":false,"description":"草稿元数据、可见性与提交状态 / Draft metadata, visibility and submission state｜存储归属 RDS｜唯一写入所有者 W-CONTENT｜表 content_video_draft；主键 PK(id)；无唯一约束；索引 INDEX(uploaderId,publishState)；外键 FK(uploaderId→data.identity.user.id, coverAssetId→data.media.media-asset.id, partitionId→data.content.partition.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"uploaderId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"title":{"type":"string","description":"title 字段 / Field title"},"coverAssetId":{"type":"string","description":"外键指向 data.media.media-asset.id（多对一，由 RDS 实施） / Foreign key to data.media.media-asset.id (many-to-one, enforced by RDS)"},"partitionId":{"type":"string","description":"外键指向 data.content.partition.id（多对一，由 RDS 实施） / Foreign key to data.content.partition.id (many-to-one, enforced by RDS)"},"visibility":{"type":"string","enum":["PUBLIC","FOLLOWERS_ONLY","UNLISTED","PRIVATE","PAID_ONLY","REGION_LOCKED"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"mediaState":{"type":"string","enum":["UPLOADED","PROBING","TRANSCODING","READY","FAILED","QUARANTINED"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"publishState":{"type":"string","enum":["DRAFT","SCHEDULED","PUBLISHING","PUBLISHED","PRIVATE","REMOVED","DELETED"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"updatedAt":{"type":"string","format":"date-time","description":"updatedAt 字段 / Field updatedAt"}},"required":["id","uploaderId","title","partitionId","visibility","mediaState","publishState","updatedAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "uploaderId→user.id，多对一", en: "uploaderId->user.id,"}
  - kind: reference
    to: data.media.media-asset
    label: {zh: "coverAssetId→media-asset.id，多对", en: "coverAssetId->media-asset.id,"}
  - kind: reference
    to: data.content.partition
    label: {zh: "partitionId→partition.id，多对一", en: "partitionId->partition.id,"}
---
