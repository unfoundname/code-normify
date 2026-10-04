---
uid: 0a3aa5ab
id: data.media.transcode-job
parent: data.media
state: planned
tags: [planned, "worker:W-MEDIA", "storage:rds"]
name: {zh: "转码任务", en: "Transcode job"}
description:
  zh: >
      转码任务、状态与重试
  en: >
      Transcode jobs, status and retries
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/media/models/transcode_job.model.sql"
apis:
  - protocol: rpc
    path: "db.table.media_transcode_job"
    description:
      zh: >
          权威表 media_transcode_job（唯一业务写入所有者：W-MEDIA；RDS 方言与适配器待定）
      en: >
          Authoritative table media_transcode_job (sole write owner: W-MEDIA; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/media/models/transcode_job.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "TranscodeJobRow"
    description: {zh: "转码任务、状态与重试", en: "Transcode jobs, status and retries"}
    schema: {"type":"object","additionalProperties":false,"description":"转码任务、状态与重试 / Transcode jobs, status and retries｜存储归属 RDS｜唯一写入所有者 W-MEDIA｜表 media_transcode_job；主键 PK(id)；唯一约束 UNIQUE(assetId,qualityId)；索引 INDEX(status)；外键 FK(assetId→data.media.media-asset.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"assetId":{"type":"string","description":"外键指向 data.media.media-asset.id（多对一，由 RDS 实施） / Foreign key to data.media.media-asset.id (many-to-one, enforced by RDS)"},"qualityId":{"type":"string","description":"qualityId 字段 / Field qualityId"},"status":{"type":"string","enum":["QUEUED","RUNNING","SUCCEEDED","FAILED","CANCELLED"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"attempt":{"type":"integer","description":"attempt 字段 / Field attempt"},"leaseUntil":{"type":"string","format":"date-time","description":"leaseUntil 字段 / Field leaseUntil"},"createdAt":{"type":"string","format":"date-time","description":"createdAt 字段 / Field createdAt"}},"required":["id","assetId","qualityId","status","attempt","createdAt"]}
deps:
  - kind: reference
    to: data.media.media-asset
    label: {zh: "assetId→media-asset.id，多对一", en: "assetId->media-asset.id,"}
---
