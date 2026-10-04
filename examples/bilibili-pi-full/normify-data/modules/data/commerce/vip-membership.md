---
uid: c7f1485d
id: data.commerce.vip-membership
parent: data.commerce
state: planned
tags: [planned, "worker:W-COMMERCE", "storage:rds"]
name: {zh: "大会员", en: "Membership"}
description:
  zh: >
      档位、有效期与自动续费
  en: >
      Tier, validity and auto-renewal
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/commerce/models/vip_membership.model.sql"
apis:
  - protocol: rpc
    path: "db.table.commerce_vip_membership"
    description:
      zh: >
          权威表 commerce_vip_membership（唯一业务写入所有者：W-COMMERCE；RDS 方言与适配器待定）
      en: >
          Authoritative table commerce_vip_membership (sole write owner: W-COMMERCE; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/commerce/models/vip_membership.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "VipMembershipRow"
    description: {zh: "档位、有效期与自动续费", en: "Tier, validity and auto-renewal"}
    schema: {"type":"object","additionalProperties":false,"description":"档位、有效期与自动续费 / Tier, validity and auto-renewal｜存储归属 RDS｜唯一写入所有者 W-COMMERCE｜表 commerce_vip_membership；主键 PK(id)；唯一约束 UNIQUE(userId)；索引 INDEX(validTo)；外键 FK(userId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"userId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"tier":{"type":"string","enum":["NONE","MONTHLY","ANNUAL","TV"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"validFrom":{"type":"string","format":"date-time","description":"validFrom 字段 / Field validFrom"},"validTo":{"type":"string","format":"date-time","description":"validTo 字段 / Field validTo"},"autoRenew":{"type":"boolean","description":"autoRenew 字段 / Field autoRenew"},"updatedAt":{"type":"string","format":"date-time","description":"updatedAt 字段 / Field updatedAt"}},"required":["id","userId","tier","validFrom","validTo","autoRenew","updatedAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "userId→user.id，多对一", en: "userId->user.id, many-to-one"}
---
