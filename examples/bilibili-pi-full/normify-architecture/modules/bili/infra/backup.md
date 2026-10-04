---
uid: d08b2062
id: bili.infra.backup
parent: bili.infra
state: planned
tags: [planned, "worker:W-INFRA", leaf]
name: {zh: "备份与恢复", en: "Backup and restore"}
description:
  zh: >
      RDS 备份计划、OSS 生命周期、恢复演练与 RPO/RTO
  en: >
      RDS backup plans, OSS lifecycle, restore drills and RPO/RTO
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "infra/backup/plan.md"
  - path: "infra/backup/restore-drill.md"
  - path: "infra/backup/tests/plan.test.ts"
  - path: "infra/backup/tests/restore-drill.test.ts"
apis:
  - protocol: file
    path: "infra/backup/plan.md"
    description:
      zh: >
          备份计划入口
      en: >
          Backup plan entry
types:
  - name: "BackupPlan"
    description: {zh: "备份计划", en: "Backup plan"}
    schema: {"type":"object","description":"备份计划 / Backup plan","additionalProperties":false,"properties":{"planId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 planId（语义见对应领域契约） / Field planId"},"target":{"type":"string","enum":["RDS","OSS","SEARCH"],"description":"字段 target（语义见对应领域契约） / Field target"},"schedule":{"type":"string","minLength":1,"description":"字段 schedule（语义见对应领域契约） / Field schedule"},"retentionDays":{"type":"integer","description":"字段 retentionDays（语义见对应领域契约） / Field retentionDays"},"rpoMinutes":{"type":"integer","description":"字段 rpoMinutes（语义见对应领域契约） / Field rpoMinutes"},"rtoMinutes":{"type":"integer","description":"字段 rtoMinutes（语义见对应领域契约） / Field rtoMinutes"}},"required":["planId","target","schedule","retentionDays","rpoMinutes","rtoMinutes"]}
deps:
  - kind: call
    to: bili.infra.db
    label: {zh: "RDS 备份与恢复边界", en: "RDS backup and restore"}
---
