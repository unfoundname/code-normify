---
uid: 09eee9a4
id: data.media.probe-result
parent: data.media
state: planned
tags: [planned, "worker:W-MEDIA", "storage:rds"]
name: {zh: "探测结果", en: "Probe result"}
description:
  zh: >
      容器/编码/轨道探测结果
  en: >
      Container, codec and track probe results
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/media/models/probe_result.model.sql"
apis:
  - protocol: rpc
    path: "db.table.media_probe_result"
    description:
      zh: >
          权威表 media_probe_result（唯一业务写入所有者：W-MEDIA；RDS 方言与适配器待定）
      en: >
          Authoritative table media_probe_result (sole write owner: W-MEDIA; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/media/models/probe_result.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "ProbeResultRow"
    description: {zh: "容器/编码/轨道探测结果", en: "Container, codec and track probe results"}
    schema: {"type":"object","additionalProperties":false,"description":"容器/编码/轨道探测结果 / Container, codec and track probe results｜存储归属 RDS｜唯一写入所有者 W-MEDIA｜表 media_probe_result；主键 PK(id)；唯一约束 UNIQUE(assetId)；无二级索引；外键 FK(assetId→data.media.media-asset.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"assetId":{"type":"string","description":"外键指向 data.media.media-asset.id（多对一，由 RDS 实施） / Foreign key to data.media.media-asset.id (many-to-one, enforced by RDS)"},"durationMs":{"type":"integer","description":"durationMs 字段 / Field durationMs"},"width":{"type":"integer","description":"width 字段 / Field width"},"height":{"type":"integer","description":"height 字段 / Field height"},"codec":{"type":"string","description":"codec 字段 / Field codec"},"rawJson":{"type":"object","additionalProperties":true,"description":"rawJson 字段 / Field rawJson"},"probedAt":{"type":"string","format":"date-time","description":"probedAt 字段 / Field probedAt"}},"required":["id","assetId","durationMs","width","height","codec","rawJson","probedAt"]}
deps:
  - kind: reference
    to: data.media.media-asset
    label: {zh: "assetId→media-asset.id，多对一", en: "assetId->media-asset.id,"}
---
