---
uid: 447acda3
id: data.channel.article
parent: data.channel
state: planned
tags: [planned, "worker:W-CHANNEL", "storage:rds"]
name: {zh: "专栏", en: "Article"}
description:
  zh: >
      专栏正文、状态与统计
  en: >
      Article body, state and stats
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/content-extra/models/article.model.sql"
apis:
  - protocol: rpc
    path: "db.table.channel_article"
    description:
      zh: >
          权威表 channel_article（唯一业务写入所有者：W-CHANNEL；RDS 方言与适配器待定）
      en: >
          Authoritative table channel_article (sole write owner: W-CHANNEL; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/content-extra/models/article.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "ArticleRow"
    description: {zh: "专栏正文、状态与统计", en: "Article body, state and stats"}
    schema: {"type":"object","additionalProperties":false,"description":"专栏正文、状态与统计 / Article body, state and stats｜存储归属 RDS｜唯一写入所有者 W-CHANNEL｜表 channel_article；主键 PK(id)；无唯一约束；索引 INDEX(authorId,auditState)；外键 FK(authorId→data.identity.user.id, coverAssetId→data.media.media-asset.id, partitionId→data.content.partition.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"authorId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"title":{"type":"string","description":"title 字段 / Field title"},"coverAssetId":{"type":"string","description":"外键指向 data.media.media-asset.id（多对一，由 RDS 实施） / Foreign key to data.media.media-asset.id (many-to-one, enforced by RDS)"},"partitionId":{"type":"string","description":"外键指向 data.content.partition.id（多对一，由 RDS 实施） / Foreign key to data.content.partition.id (many-to-one, enforced by RDS)"},"auditState":{"type":"string","enum":["PENDING","PASSED","REJECTED","ESCALATED","APPEALING"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"readCount":{"type":"integer","description":"readCount 字段 / Field readCount"},"publishedAt":{"type":"string","format":"date-time","description":"publishedAt 字段 / Field publishedAt"}},"required":["id","authorId","title","partitionId","auditState","readCount"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "authorId→user.id，多对一", en: "authorId->user.id, many-to-one"}
  - kind: reference
    to: data.media.media-asset
    label: {zh: "coverAssetId→media-asset.id，多对", en: "coverAssetId->media-asset.id,"}
  - kind: reference
    to: data.content.partition
    label: {zh: "partitionId→partition.id，多对一", en: "partitionId->partition.id,"}
---
