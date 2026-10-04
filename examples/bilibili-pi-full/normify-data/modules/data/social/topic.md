---
uid: 1c2911cc
id: data.social.topic
parent: data.social
state: planned
tags: [planned, "worker:W-SOCIAL", "storage:rds"]
name: {zh: "话题", en: "Topic"}
description:
  zh: >
      话题、审核与热度
  en: >
      Topics with moderation state and heat
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/community/models/topic.model.sql"
apis:
  - protocol: rpc
    path: "db.table.social_topic"
    description:
      zh: >
          权威表 social_topic（唯一业务写入所有者：W-SOCIAL；RDS 方言与适配器待定）
      en: >
          Authoritative table social_topic (sole write owner: W-SOCIAL; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/community/models/topic.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "TopicRow"
    description: {zh: "话题、审核与热度", en: "Topics with moderation state and heat"}
    schema: {"type":"object","additionalProperties":false,"description":"话题、审核与热度 / Topics with moderation state and heat｜存储归属 RDS｜唯一写入所有者 W-SOCIAL｜表 social_topic；主键 PK(id)；唯一约束 UNIQUE(name)；索引 INDEX(hotScore)；外键 FK(creatorId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"name":{"type":"string","description":"name 字段 / Field name"},"creatorId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"auditState":{"type":"string","enum":["PENDING","PASSED","REJECTED","ESCALATED","APPEALING"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"postCount":{"type":"integer","description":"postCount 字段 / Field postCount"},"hotScore":{"type":"number","description":"hotScore 字段 / Field hotScore"},"createdAt":{"type":"string","format":"date-time","description":"createdAt 字段 / Field createdAt"}},"required":["id","name","auditState","postCount","hotScore","createdAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "creatorId→user.id，多对一", en: "creatorId->user.id,"}
---
