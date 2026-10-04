---
uid: a286d1ce
id: data.acquire.acquire-source
parent: data.acquire
state: planned
tags: [planned, "worker:W-ACQUIRE", "storage:rds"]
name: {zh: "许可来源", en: "Licensed source"}
description:
  zh: >
      来源、许可类型与可获取范围
  en: >
      Sources, license types and obtainable scope
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/content-extra/models/acquire_source.model.sql"
apis:
  - protocol: rpc
    path: "db.table.acquire_source"
    description:
      zh: >
          权威表 acquire_source（唯一业务写入所有者：W-ACQUIRE；RDS 方言与适配器待定）
      en: >
          Authoritative table acquire_source (sole write owner: W-ACQUIRE; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/content-extra/models/acquire_source.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "AcquireSourceRow"
    description: {zh: "来源、许可类型与可获取范围", en: "Sources, license types and obtainable scope"}
    schema: {"type":"object","additionalProperties":false,"description":"来源、许可类型与可获取范围 / Sources, license types and obtainable scope｜存储归属 RDS｜唯一写入所有者 W-ACQUIRE｜表 acquire_source；主键 PK(id)；唯一约束 UNIQUE(sourceUrl)；无二级索引；无外键｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"name":{"type":"string","description":"name 字段 / Field name"},"sourceUrl":{"type":"string","description":"sourceUrl 字段 / Field sourceUrl"},"licenseType":{"type":"string","enum":["PUBLIC_DOMAIN","CC_BY","CC_BY_SA","COMMERCIAL","AUTHORIZED_UPLOAD"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"obtainableKinds":{"type":"array","items":{"type":"string","enum":["VIDEO","AUDIO","IMAGE"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"health":{"type":"string","enum":["HEALTHY","DEGRADED","DOWN"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"createdAt":{"type":"string","format":"date-time","description":"createdAt 字段 / Field createdAt"}},"required":["id","name","sourceUrl","licenseType","obtainableKinds","health","createdAt"]}
---
