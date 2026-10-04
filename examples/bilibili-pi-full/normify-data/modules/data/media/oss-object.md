---
uid: de122019
id: data.media.oss-object
parent: data.media
state: planned
tags: [planned, "worker:W-MEDIA", "storage:rds"]
name: {zh: "OSS 对象元数据登记表（RDS）", en: "OSS object metadata registry (RDS)"}
description:
  zh: >
      对象元数据行存在 RDS，二进制只存在 OSS；RDS 不实施跨存储外键，仅保存 bucket/objectKey 引用，跨存储一致性由媒体模块校验
  en: >
      Object metadata rows live in RDS while binaries live only in OSS; RDS never enforces a cross-store foreign key and only stores bucket/objectKey references validated by the media module
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/media/models/oss_object.model.sql"
apis:
  - protocol: rpc
    path: "db.table.media_oss_object"
    description:
      zh: >
          权威表 media_oss_object（唯一业务写入所有者：W-MEDIA；RDS 方言与适配器待定）
      en: >
          Authoritative table media_oss_object (sole write owner: W-MEDIA; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/media/models/oss_object.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "OssObjectRow"
    description: {zh: "对象元数据行存在 RDS，二进制只存在 OSS；RDS 不实施跨存储外键，仅保存 bucket/objectKey 引用，跨存储一致性由媒体模块校验", en: "Object metadata rows live in RDS while binaries live only in OSS; RDS never enforces a cross-store foreign key and only stores bucket/objectKey references validated by the media module"}
    schema: {"type":"object","additionalProperties":false,"description":"对象元数据行存在 RDS，二进制只存在 OSS；RDS 不实施跨存储外键，仅保存 bucket/objectKey 引用，跨存储一致性由媒体模块校验 / Object metadata rows live in RDS while binaries live only in OSS; RDS never enforces a cross-store foreign key and only stores bucket/objectKey references validated by the media module｜存储归属 RDS｜唯一写入所有者 W-MEDIA｜表 media_oss_object；主键 PK(id)；唯一约束 UNIQUE(bucket,objectKey)；索引 INDEX(sha256), INDEX(kind)；无外键｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"bucket":{"type":"string","description":"bucket 字段 / Field bucket"},"objectKey":{"type":"string","description":"objectKey 字段 / Field objectKey"},"kind":{"type":"string","enum":["ORIGINAL","TRANSCODE","COVER","PREVIEW","SUBTITLE","AUDIO","REPLAY","ARTICLE_IMAGE","DRESSUP"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"mimeType":{"type":"string","description":"mimeType 字段 / Field mimeType"},"sizeBytes":{"type":"integer","description":"sizeBytes 字段 / Field sizeBytes"},"sha256":{"type":"string","description":"sha256 字段 / Field sha256"},"etag":{"type":"string","description":"etag 字段 / Field etag"},"lifecycleRule":{"type":"string","description":"lifecycleRule 字段 / Field lifecycleRule"},"createdAt":{"type":"string","format":"date-time","description":"createdAt 字段 / Field createdAt"}},"required":["id","bucket","objectKey","kind","mimeType","sizeBytes","sha256","lifecycleRule","createdAt"]}
---
