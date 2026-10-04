---
uid: 58c19ad5
id: data.content.partition
parent: data.content
state: planned
tags: [planned, "worker:W-CONTENT", "storage:rds"]
name: {zh: "分区", en: "Partition"}
description:
  zh: >
      分区树与允许内容类型
  en: >
      Partition tree and allowed content types
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/content/models/partition.model.sql"
apis:
  - protocol: rpc
    path: "db.table.content_partition"
    description:
      zh: >
          权威表 content_partition（唯一业务写入所有者：W-CONTENT；RDS 方言与适配器待定）
      en: >
          Authoritative table content_partition (sole write owner: W-CONTENT; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/content/models/partition.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "PartitionRow"
    description: {zh: "分区树与允许内容类型", en: "Partition tree and allowed content types"}
    schema: {"type":"object","additionalProperties":false,"description":"分区树与允许内容类型 / Partition tree and allowed content types｜存储归属 RDS｜唯一写入所有者 W-CONTENT｜表 content_partition；主键 PK(id)；无唯一约束；索引 INDEX(orderIndex), INDEX(parentId)；外键 FK(parentId→data.content.partition.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"name":{"type":"string","description":"name 字段 / Field name"},"orderIndex":{"type":"integer","description":"orderIndex 字段 / Field orderIndex"},"allowedContentTypes":{"type":"array","items":{"type":"string","enum":["VIDEO","ARTICLE","AUDIO","LIVE","COURSE"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"active":{"type":"boolean","description":"active 字段 / Field active"},"parentId":{"type":"string","description":"外键指向 data.content.partition.id（多对一，由 RDS 实施） / Foreign key to data.content.partition.id (many-to-one, enforced by RDS)"}},"required":["id","name","orderIndex","allowedContentTypes","active"]}
---
