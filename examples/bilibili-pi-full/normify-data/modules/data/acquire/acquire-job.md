---
uid: 86e9fc88
id: data.acquire.acquire-job
parent: data.acquire
state: planned
tags: [planned, "worker:W-ACQUIRE", "storage:rds"]
name: {zh: "获取任务", en: "Acquisition job"}
description:
  zh: >
      抓取任务、限速与结果
  en: >
      Fetch jobs, rate limits and results
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/content-extra/models/acquire_job.model.sql"
apis:
  - protocol: rpc
    path: "db.table.acquire_job"
    description:
      zh: >
          权威表 acquire_job（唯一业务写入所有者：W-ACQUIRE；RDS 方言与适配器待定）
      en: >
          Authoritative table acquire_job (sole write owner: W-ACQUIRE; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/content-extra/models/acquire_job.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "AcquireJobRow"
    description: {zh: "抓取任务、限速与结果", en: "Fetch jobs, rate limits and results"}
    schema: {"type":"object","additionalProperties":false,"description":"抓取任务、限速与结果 / Fetch jobs, rate limits and results｜存储归属 RDS｜唯一写入所有者 W-ACQUIRE｜表 acquire_job；主键 PK(id)；无唯一约束；索引 INDEX(jobState,createdAt)；外键 FK(sourceId→data.acquire.acquire-source.id, licenseEvidenceId→data.acquire.license-evidence.id, assetId→data.media.media-asset.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"sourceId":{"type":"string","description":"外键指向 data.acquire.acquire-source.id（多对一，由 RDS 实施） / Foreign key to data.acquire.acquire-source.id (many-to-one, enforced by RDS)"},"licenseEvidenceId":{"type":"string","description":"外键指向 data.acquire.license-evidence.id（多对一，由 RDS 实施） / Foreign key to data.acquire.license-evidence.id (many-to-one, enforced by RDS)"},"targetUrl":{"type":"string","description":"targetUrl 字段 / Field targetUrl"},"jobState":{"type":"string","enum":["QUEUED","RUNNING","SUCCEEDED","FAILED"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"attempt":{"type":"integer","description":"attempt 字段 / Field attempt"},"assetId":{"type":"string","description":"外键指向 data.media.media-asset.id（多对一，由 RDS 实施） / Foreign key to data.media.media-asset.id (many-to-one, enforced by RDS)"},"createdAt":{"type":"string","format":"date-time","description":"createdAt 字段 / Field createdAt"}},"required":["id","sourceId","licenseEvidenceId","targetUrl","jobState","attempt","createdAt"]}
deps:
  - kind: reference
    to: data.acquire.acquire-source
    label: {zh: "sourceId→acquire-source.id，多对一", en: "sourceId->acquire-source.id,"}
  - kind: reference
    to: data.acquire.license-evidence
    label: {zh: "licenseEvidenceId→license-evid", en: "licenseEvidenceId->license-evi"}
  - kind: reference
    to: data.media.media-asset
    label: {zh: "assetId→media-asset.id，多对一", en: "assetId->media-asset.id,"}
---
