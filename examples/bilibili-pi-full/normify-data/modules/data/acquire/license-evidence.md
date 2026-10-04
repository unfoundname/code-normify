---
uid: 1a4463cf
id: data.acquire.license-evidence
parent: data.acquire
state: planned
tags: [planned, "worker:W-ACQUIRE", "storage:rds"]
name: {zh: "许可证据", en: "License evidence"}
description:
  zh: >
      证据对象、核验与期限
  en: >
      Evidence objects, verification and validity
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/content-extra/models/license_evidence.model.sql"
apis:
  - protocol: rpc
    path: "db.table.acquire_license_evidence"
    description:
      zh: >
          权威表 acquire_license_evidence（唯一业务写入所有者：W-ACQUIRE；RDS 方言与适配器待定）
      en: >
          Authoritative table acquire_license_evidence (sole write owner: W-ACQUIRE; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/content-extra/models/license_evidence.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "LicenseEvidenceRow"
    description: {zh: "证据对象、核验与期限", en: "Evidence objects, verification and validity"}
    schema: {"type":"object","additionalProperties":false,"description":"证据对象、核验与期限 / Evidence objects, verification and validity｜存储归属 RDS｜唯一写入所有者 W-ACQUIRE｜表 acquire_license_evidence；主键 PK(id)；无唯一约束；索引 INDEX(sourceId,licenseVerified)；外键 FK(sourceId→data.acquire.acquire-source.id, reviewerId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"sourceId":{"type":"string","description":"外键指向 data.acquire.acquire-source.id（多对一，由 RDS 实施） / Foreign key to data.acquire.acquire-source.id (many-to-one, enforced by RDS)"},"licenseType":{"type":"string","enum":["PUBLIC_DOMAIN","CC_BY","CC_BY_SA","COMMERCIAL","AUTHORIZED_UPLOAD"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"evidenceObjectKey":{"type":"string","description":"evidenceObjectKey 字段 / Field evidenceObjectKey"},"licenseVerified":{"type":"boolean","description":"licenseVerified 字段 / Field licenseVerified"},"validTo":{"type":"string","format":"date-time","description":"validTo 字段 / Field validTo"},"reviewerId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"}},"required":["id","sourceId","licenseType","evidenceObjectKey","licenseVerified"]}
deps:
  - kind: reference
    to: data.acquire.acquire-source
    label: {zh: "sourceId→acquire-source.id，多对一", en: "sourceId->acquire-source.id,"}
  - kind: reference
    to: data.identity.user
    label: {zh: "reviewerId→user.id，多对一", en: "reviewerId->user.id,"}
---
