---
uid: 383f5f79
id: data.social.mute-rule
parent: data.social
state: planned
tags: [planned, "worker:W-SOCIAL", "storage:rds"]
name: {zh: "屏蔽规则", en: "Mute rule"}
description:
  zh: >
      屏蔽词、屏蔽话题与屏蔽 UP 主
  en: >
      Muted keywords, topics and uploaders
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/community/models/mute_rule.model.sql"
apis:
  - protocol: rpc
    path: "db.table.social_mute_rule"
    description:
      zh: >
          权威表 social_mute_rule（唯一业务写入所有者：W-SOCIAL；RDS 方言与适配器待定）
      en: >
          Authoritative table social_mute_rule (sole write owner: W-SOCIAL; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/community/models/mute_rule.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "MuteRuleRow"
    description: {zh: "屏蔽词、屏蔽话题与屏蔽 UP 主", en: "Muted keywords, topics and uploaders"}
    schema: {"type":"object","additionalProperties":false,"description":"屏蔽词、屏蔽话题与屏蔽 UP 主 / Muted keywords, topics and uploaders｜存储归属 RDS｜唯一写入所有者 W-SOCIAL｜表 social_mute_rule；主键 PK(id)；唯一约束 UNIQUE(ownerId,kind,value)；无二级索引；外键 FK(ownerId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"ownerId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"kind":{"type":"string","enum":["KEYWORD","TOPIC","UPLOADER"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"value":{"type":"string","description":"value 字段 / Field value"},"createdAt":{"type":"string","format":"date-time","description":"createdAt 字段 / Field createdAt"}},"required":["id","ownerId","kind","value","createdAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "ownerId→user.id，多对一", en: "ownerId->user.id, many-to-one"}
---
