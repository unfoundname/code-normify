---
uid: d7975e6c
id: data.commerce.entitlement
parent: data.commerce
state: planned
tags: [planned, "worker:W-COMMERCE", "storage:rds"]
name: {zh: "权益记录", en: "Entitlement record"}
description:
  zh: >
      权益授予与消耗
  en: >
      Granted and consumed entitlements
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/commerce/models/entitlement.model.sql"
apis:
  - protocol: rpc
    path: "db.table.commerce_entitlement"
    description:
      zh: >
          权威表 commerce_entitlement（唯一业务写入所有者：W-COMMERCE；RDS 方言与适配器待定）
      en: >
          Authoritative table commerce_entitlement (sole write owner: W-COMMERCE; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/commerce/models/entitlement.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "EntitlementRow"
    description: {zh: "权益授予与消耗", en: "Granted and consumed entitlements"}
    schema: {"type":"object","additionalProperties":false,"description":"权益授予与消耗 / Granted and consumed entitlements｜存储归属 RDS｜唯一写入所有者 W-COMMERCE｜表 commerce_entitlement；主键 PK(id)；无唯一约束；索引 INDEX(userId,kind)；外键 FK(userId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"userId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"kind":{"type":"string","enum":["VIP","COURSE","CHARGE","DIGITAL","VOUCHER"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"resourceId":{"type":"string","description":"resourceId 字段 / Field resourceId"},"grantedAt":{"type":"string","format":"date-time","description":"grantedAt 字段 / Field grantedAt"},"expireAt":{"type":"string","format":"date-time","description":"expireAt 字段 / Field expireAt"},"consumed":{"type":"boolean","description":"consumed 字段 / Field consumed"}},"required":["id","userId","kind","grantedAt","consumed"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "userId→user.id，多对一", en: "userId->user.id, many-to-one"}
---
