---
uid: 676491f5
id: data.channel.article-revision
parent: data.channel
state: planned
tags: [planned, "worker:W-CHANNEL", "storage:rds"]
name: {zh: "专栏版本", en: "Article revision"}
description:
  zh: >
      专栏历史版本
  en: >
      Article revision history
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/content-extra/models/article_revision.model.sql"
apis:
  - protocol: rpc
    path: "db.table.channel_article_revision"
    description:
      zh: >
          权威表 channel_article_revision（唯一业务写入所有者：W-CHANNEL；RDS 方言与适配器待定）
      en: >
          Authoritative table channel_article_revision (sole write owner: W-CHANNEL; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/content-extra/models/article_revision.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "ArticleRevisionRow"
    description: {zh: "专栏历史版本", en: "Article revision history"}
    schema: {"type":"object","additionalProperties":false,"description":"专栏历史版本 / Article revision history｜存储归属 RDS｜唯一写入所有者 W-CHANNEL｜表 channel_article_revision；主键 PK(id)；唯一约束 UNIQUE(articleId,versionNo)；无二级索引；外键 FK(articleId→data.channel.article.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"articleId":{"type":"string","description":"外键指向 data.channel.article.id（多对一，由 RDS 实施） / Foreign key to data.channel.article.id (many-to-one, enforced by RDS)"},"versionNo":{"type":"integer","description":"versionNo 字段 / Field versionNo"},"contentObjectKey":{"type":"string","description":"contentObjectKey 字段 / Field contentObjectKey"},"createdAt":{"type":"string","format":"date-time","description":"createdAt 字段 / Field createdAt"}},"required":["id","articleId","versionNo","contentObjectKey","createdAt"]}
deps:
  - kind: reference
    to: data.channel.article
    label: {zh: "articleId→article.id，多对一", en: "articleId->article.id,"}
---
