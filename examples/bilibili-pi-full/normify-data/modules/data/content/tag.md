---
uid: 3797a9c3
id: data.content.tag
parent: data.content
state: planned
tags: [planned, "worker:W-CONTENT", "storage:rds"]
name: {zh: "标签", en: "Tag"}
description:
  zh: >
      标签库与标签类型
  en: >
      Tag library and tag kinds
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/content/models/tag.model.sql"
apis:
  - protocol: rpc
    path: "db.table.content_tag"
    description:
      zh: >
          权威表 content_tag（唯一业务写入所有者：W-CONTENT；RDS 方言与适配器待定）
      en: >
          Authoritative table content_tag (sole write owner: W-CONTENT; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/content/models/tag.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "TagRow"
    description: {zh: "标签库与标签类型", en: "Tag library and tag kinds"}
    schema: {"type":"object","additionalProperties":false,"description":"标签库与标签类型 / Tag library and tag kinds｜存储归属 RDS｜唯一写入所有者 W-CONTENT｜表 content_tag；主键 PK(id)；唯一约束 UNIQUE(name,kind)；无二级索引；无外键｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"name":{"type":"string","description":"name 字段 / Field name"},"kind":{"type":"string","enum":["TOPIC","SYSTEM","ACTIVITY","OFFICIAL"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"auditRequired":{"type":"boolean","description":"auditRequired 字段 / Field auditRequired"}},"required":["id","name","kind","auditRequired"]}
---
