---
uid: 2507e4d1
id: data.acquire.dedupe-record
parent: data.acquire
state: planned
tags: [planned, "worker:W-ACQUIRE", "storage:rds"]
name: {zh: "去重记录", en: "Dedupe record"}
description:
  zh: >
      内容指纹与重复判定
  en: >
      Content fingerprints and duplicate decisions
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/content-extra/models/dedupe_record.model.sql"
apis:
  - protocol: rpc
    path: "db.table.acquire_dedupe_record"
    description:
      zh: >
          权威表 acquire_dedupe_record（唯一业务写入所有者：W-ACQUIRE；RDS 方言与适配器待定）
      en: >
          Authoritative table acquire_dedupe_record (sole write owner: W-ACQUIRE; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/content-extra/models/dedupe_record.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "DedupeRecordRow"
    description: {zh: "内容指纹与重复判定", en: "Content fingerprints and duplicate decisions"}
    schema: {"type":"object","additionalProperties":false,"description":"内容指纹与重复判定 / Content fingerprints and duplicate decisions｜存储归属 RDS｜唯一写入所有者 W-ACQUIRE｜表 acquire_dedupe_record；主键 PK(id)；唯一约束 UNIQUE(assetId,fingerprintHash)；无二级索引；外键 FK(assetId→data.media.media-asset.id, dedupeOfAssetId→data.media.media-asset.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"assetId":{"type":"string","description":"外键指向 data.media.media-asset.id（多对一，由 RDS 实施） / Foreign key to data.media.media-asset.id (many-to-one, enforced by RDS)"},"fingerprintHash":{"type":"string","description":"fingerprintHash 字段 / Field fingerprintHash"},"dedupeOfAssetId":{"type":"string","description":"外键指向 data.media.media-asset.id（多对一，由 RDS 实施） / Foreign key to data.media.media-asset.id (many-to-one, enforced by RDS)"},"similarity":{"type":"number","description":"similarity 字段 / Field similarity"},"decidedAt":{"type":"string","format":"date-time","description":"decidedAt 字段 / Field decidedAt"}},"required":["id","assetId","fingerprintHash","similarity","decidedAt"]}
deps:
  - kind: reference
    to: data.media.media-asset
    label: {zh: "assetId→media-asset.id+dedupeO", en: "assetId->media-asset.id+dedupe"}
---
