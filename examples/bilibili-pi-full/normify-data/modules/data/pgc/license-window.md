---
uid: c010c6b4
id: data.pgc.license-window
parent: data.pgc
state: planned
tags: [planned, "worker:W-PGC", "storage:rds"]
name: {zh: "版权窗口", en: "License window"}
description:
  zh: >
      地域、期限与独占性
  en: >
      Territory, term and exclusivity
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/pgc/models/license_window.model.sql"
apis:
  - protocol: rpc
    path: "db.table.pgc_license_window"
    description:
      zh: >
          权威表 pgc_license_window（唯一业务写入所有者：W-PGC；RDS 方言与适配器待定）
      en: >
          Authoritative table pgc_license_window (sole write owner: W-PGC; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/pgc/models/license_window.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "LicenseWindowRow"
    description: {zh: "地域、期限与独占性", en: "Territory, term and exclusivity"}
    schema: {"type":"object","additionalProperties":false,"description":"地域、期限与独占性 / Territory, term and exclusivity｜存储归属 RDS｜唯一写入所有者 W-PGC｜表 pgc_license_window；主键 PK(id)；无唯一约束；索引 INDEX(resourceId,validTo)；外键 FK(evidenceId→data.acquire.license-evidence.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"resourceId":{"type":"string","description":"resourceId 字段 / Field resourceId"},"territoryCodes":{"type":"array","items":{"type":"string"},"description":"territoryCodes 字段 / Field territoryCodes"},"validFrom":{"type":"string","format":"date-time","description":"validFrom 字段 / Field validFrom"},"validTo":{"type":"string","format":"date-time","description":"validTo 字段 / Field validTo"},"exclusive":{"type":"boolean","description":"exclusive 字段 / Field exclusive"},"holder":{"type":"string","description":"holder 字段 / Field holder"},"evidenceId":{"type":"string","description":"外键指向 data.acquire.license-evidence.id（多对一，由 RDS 实施） / Foreign key to data.acquire.license-evidence.id (many-to-one, enforced by RDS)"}},"required":["id","resourceId","territoryCodes","validFrom","validTo","exclusive","holder"]}
deps:
  - kind: reference
    to: data.acquire.license-evidence
    label: {zh: "evidenceId→license-evidence.id", en: "evidenceId->license-evidence.i"}
---
