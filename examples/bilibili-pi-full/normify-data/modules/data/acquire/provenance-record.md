---
uid: f3863b2d
id: data.acquire.provenance-record
parent: data.acquire
state: planned
tags: [planned, "worker:W-ACQUIRE", "storage:rds"]
name: {zh: "溯源记录", en: "Provenance record"}
description:
  zh: >
      来源链路、原作者归属与许可
  en: >
      Source chains, original author attribution and license
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/content-extra/models/provenance_record.model.sql"
apis:
  - protocol: rpc
    path: "db.table.acquire_provenance_record"
    description:
      zh: >
          权威表 acquire_provenance_record（唯一业务写入所有者：W-ACQUIRE；RDS 方言与适配器待定）
      en: >
          Authoritative table acquire_provenance_record (sole write owner: W-ACQUIRE; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/content-extra/models/provenance_record.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "ProvenanceRecordRow"
    description: {zh: "来源链路、原作者归属与许可", en: "Source chains, original author attribution and license"}
    schema: {"type":"object","additionalProperties":false,"description":"来源链路、原作者归属与许可 / Source chains, original author attribution and license｜存储归属 RDS｜唯一写入所有者 W-ACQUIRE｜表 acquire_provenance_record；主键 PK(id)；无唯一约束；索引 INDEX(assetId)；外键 FK(assetId→data.media.media-asset.id, sourceId→data.acquire.acquire-source.id, evidenceId→data.acquire.license-evidence.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"assetId":{"type":"string","description":"外键指向 data.media.media-asset.id（多对一，由 RDS 实施） / Foreign key to data.media.media-asset.id (many-to-one, enforced by RDS)"},"sourceId":{"type":"string","description":"外键指向 data.acquire.acquire-source.id（多对一，由 RDS 实施） / Foreign key to data.acquire.acquire-source.id (many-to-one, enforced by RDS)"},"evidenceId":{"type":"string","description":"外键指向 data.acquire.license-evidence.id（多对一，由 RDS 实施） / Foreign key to data.acquire.license-evidence.id (many-to-one, enforced by RDS)"},"originalAuthor":{"type":"string","description":"originalAuthor 字段 / Field originalAuthor"},"attribution":{"type":"string","description":"attribution 字段 / Field attribution"}},"required":["id","assetId","sourceId","evidenceId","originalAuthor","attribution"]}
deps:
  - kind: reference
    to: data.media.media-asset
    label: {zh: "assetId→media-asset.id，多对一", en: "assetId->media-asset.id,"}
  - kind: reference
    to: data.acquire.acquire-source
    label: {zh: "sourceId→acquire-source.id，多对一", en: "sourceId->acquire-source.id,"}
  - kind: reference
    to: data.acquire.license-evidence
    label: {zh: "evidenceId→license-evidence.id", en: "evidenceId->license-evidence.i"}
---
