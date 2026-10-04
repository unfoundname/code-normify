---
uid: 9138c1a8
id: data.content.video
parent: data.content
state: planned
tags: [planned, "worker:W-CONTENT", "storage:rds"]
name: {zh: "视频目录", en: "Video catalog"}
description:
  zh: >
      已发布视频的权威目录行（唯一发布命令写入）
  en: >
      The authoritative catalog row written only by the sole publish command
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/content/models/video.model.sql"
apis:
  - protocol: rpc
    path: "db.table.content_video"
    description:
      zh: >
          权威表 content_video（唯一业务写入所有者：W-CONTENT；RDS 方言与适配器待定）
      en: >
          Authoritative table content_video (sole write owner: W-CONTENT; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/content/models/video.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "VideoRow"
    description: {zh: "已发布视频的权威目录行（唯一发布命令写入）", en: "The authoritative catalog row written only by the sole publish command"}
    schema: {"type":"object","additionalProperties":false,"description":"已发布视频的权威目录行（唯一发布命令写入） / The authoritative catalog row written only by the sole publish command｜存储归属 RDS｜唯一写入所有者 W-CONTENT｜表 content_video；主键 PK(id)；唯一约束 UNIQUE(bvid)；索引 INDEX(uploaderId,publishState), INDEX(partitionId,publishedAt)；外键 FK(uploaderId→data.identity.user.id, coverAssetId→data.media.media-asset.id, partitionId→data.content.partition.id, seasonId→data.pgc.season.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"bvid":{"type":"string","description":"bvid 字段 / Field bvid"},"uploaderId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"title":{"type":"string","description":"title 字段 / Field title"},"coverAssetId":{"type":"string","description":"外键指向 data.media.media-asset.id（多对一，由 RDS 实施） / Foreign key to data.media.media-asset.id (many-to-one, enforced by RDS)"},"durationMs":{"type":"integer","description":"durationMs 字段 / Field durationMs"},"partitionId":{"type":"string","description":"外键指向 data.content.partition.id（多对一，由 RDS 实施） / Foreign key to data.content.partition.id (many-to-one, enforced by RDS)"},"seasonId":{"type":"string","description":"外键指向 data.pgc.season.id（多对一，由 RDS 实施） / Foreign key to data.pgc.season.id (many-to-one, enforced by RDS)"},"visibility":{"type":"string","enum":["PUBLIC","FOLLOWERS_ONLY","UNLISTED","PRIVATE","PAID_ONLY","REGION_LOCKED"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"publishState":{"type":"string","enum":["DRAFT","SCHEDULED","PUBLISHING","PUBLISHED","PRIVATE","REMOVED","DELETED"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"auditState":{"type":"string","enum":["PENDING","PASSED","REJECTED","ESCALATED","APPEALING"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"publishedAt":{"type":"string","format":"date-time","description":"publishedAt 字段 / Field publishedAt"},"updatedAt":{"type":"string","format":"date-time","description":"updatedAt 字段 / Field updatedAt"}},"required":["id","bvid","uploaderId","title","coverAssetId","durationMs","partitionId","visibility","publishState","auditState","updatedAt"]}
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
  - kind: reference
    to: data.pgc.season
    label: {zh: "seasonId→season.id，多对一", en: "seasonId->season.id,"}
---
