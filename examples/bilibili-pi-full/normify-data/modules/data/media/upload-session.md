---
uid: 59308a30
id: data.media.upload-session
parent: data.media
state: planned
tags: [planned, "worker:W-MEDIA", "storage:rds"]
name: {zh: "上传会话", en: "Upload session"}
description:
  zh: >
      分片上传会话与断点信息
  en: >
      Chunked upload session and resume information
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/media/models/upload_session.model.sql"
apis:
  - protocol: rpc
    path: "db.table.media_upload_session"
    description:
      zh: >
          权威表 media_upload_session（唯一业务写入所有者：W-MEDIA；RDS 方言与适配器待定）
      en: >
          Authoritative table media_upload_session (sole write owner: W-MEDIA; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/media/models/upload_session.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "UploadSessionRow"
    description: {zh: "分片上传会话与断点信息", en: "Chunked upload session and resume information"}
    schema: {"type":"object","additionalProperties":false,"description":"分片上传会话与断点信息 / Chunked upload session and resume information｜存储归属 RDS｜唯一写入所有者 W-MEDIA｜表 media_upload_session；主键 PK(id)；无唯一约束；索引 INDEX(ownerId,status)；外键 FK(ownerId→data.identity.user.id, assetId→data.media.media-asset.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"ownerId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"assetId":{"type":"string","description":"外键指向 data.media.media-asset.id（多对一，由 RDS 实施） / Foreign key to data.media.media-asset.id (many-to-one, enforced by RDS)"},"partCount":{"type":"integer","description":"partCount 字段 / Field partCount"},"uploadedParts":{"type":"array","items":{"type":"string"},"description":"uploadedParts 字段 / Field uploadedParts"},"status":{"type":"string","enum":["OPEN","COMPLETED","ABORTED","EXPIRED"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"expireAt":{"type":"string","format":"date-time","description":"expireAt 字段 / Field expireAt"}},"required":["id","ownerId","assetId","partCount","uploadedParts","status","expireAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "ownerId→user.id，多对一", en: "ownerId->user.id, many-to-one"}
  - kind: reference
    to: data.media.media-asset
    label: {zh: "assetId→media-asset.id，多对一", en: "assetId->media-asset.id,"}
---
