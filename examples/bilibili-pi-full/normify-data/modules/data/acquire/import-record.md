---
uid: 044c6a9f
id: data.acquire.import-record
parent: data.acquire
state: planned
tags: [planned, "worker:W-ACQUIRE", "storage:rds"]
name: {zh: "导入记录", en: "Import record"}
description:
  zh: >
      导入草稿与发布结果
  en: >
      Imports into drafts and publish results
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/content-extra/models/import_record.model.sql"
apis:
  - protocol: rpc
    path: "db.table.acquire_import_record"
    description:
      zh: >
          权威表 acquire_import_record（唯一业务写入所有者：W-ACQUIRE；RDS 方言与适配器待定）
      en: >
          Authoritative table acquire_import_record (sole write owner: W-ACQUIRE; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/content-extra/models/import_record.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "ImportRecordRow"
    description: {zh: "导入草稿与发布结果", en: "Imports into drafts and publish results"}
    schema: {"type":"object","additionalProperties":false,"description":"导入草稿与发布结果 / Imports into drafts and publish results｜存储归属 RDS｜唯一写入所有者 W-ACQUIRE｜表 acquire_import_record；主键 PK(id)；唯一约束 UNIQUE(idempotencyKey)；无二级索引；外键 FK(provenanceId→data.acquire.provenance-record.id, draftId→data.content.video-draft.id, bvid→data.content.video.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"provenanceId":{"type":"string","description":"外键指向 data.acquire.provenance-record.id（多对一，由 RDS 实施） / Foreign key to data.acquire.provenance-record.id (many-to-one, enforced by RDS)"},"draftId":{"type":"string","description":"外键指向 data.content.video-draft.id（多对一，由 RDS 实施） / Foreign key to data.content.video-draft.id (many-to-one, enforced by RDS)"},"bvid":{"type":"string","description":"外键指向 data.content.video.id（多对一，由 RDS 实施） / Foreign key to data.content.video.id (many-to-one, enforced by RDS)"},"idempotencyKey":{"type":"string","description":"idempotencyKey 字段 / Field idempotencyKey"},"createdAt":{"type":"string","format":"date-time","description":"createdAt 字段 / Field createdAt"}},"required":["id","provenanceId","draftId","idempotencyKey","createdAt"]}
deps:
  - kind: reference
    to: data.acquire.provenance-record
    label: {zh: "provenanceId→provenance-record", en: "provenanceId->provenance-recor"}
  - kind: reference
    to: data.content.video-draft
    label: {zh: "draftId→video-draft.id，多对一", en: "draftId->video-draft.id,"}
  - kind: reference
    to: data.content.video
    label: {zh: "bvid→video.id，多对一", en: "bvid->video.id, many-to-one"}
---
