---
uid: c1cb7da1
id: data.media.preview-artifact
parent: data.media
state: planned
tags: [planned, "worker:W-MEDIA", "storage:rds"]
name: {zh: "预览产物", en: "Preview artifact"}
description:
  zh: >
      预览片段、雪碧图与故事板
  en: >
      Preview clips, sprite sheets and storyboards
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/media/models/preview_artifact.model.sql"
apis:
  - protocol: rpc
    path: "db.table.media_preview_artifact"
    description:
      zh: >
          权威表 media_preview_artifact（唯一业务写入所有者：W-MEDIA；RDS 方言与适配器待定）
      en: >
          Authoritative table media_preview_artifact (sole write owner: W-MEDIA; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/media/models/preview_artifact.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "PreviewArtifactRow"
    description: {zh: "预览片段、雪碧图与故事板", en: "Preview clips, sprite sheets and storyboards"}
    schema: {"type":"object","additionalProperties":false,"description":"预览片段、雪碧图与故事板 / Preview clips, sprite sheets and storyboards｜存储归属 RDS｜唯一写入所有者 W-MEDIA｜表 media_preview_artifact；主键 PK(id)；唯一约束 UNIQUE(assetId,kind)；无二级索引；外键 FK(assetId→data.media.media-asset.id, objectId→data.media.oss-object.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"assetId":{"type":"string","description":"外键指向 data.media.media-asset.id（多对一，由 RDS 实施） / Foreign key to data.media.media-asset.id (many-to-one, enforced by RDS)"},"objectId":{"type":"string","description":"外键指向 data.media.oss-object.id（多对一，由 RDS 实施） / Foreign key to data.media.oss-object.id (many-to-one, enforced by RDS)"},"kind":{"type":"string","enum":["CLIP","SPRITE","STORYBOARD"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"intervalSec":{"type":"integer","description":"intervalSec 字段 / Field intervalSec"},"durationMs":{"type":"integer","description":"durationMs 字段 / Field durationMs"}},"required":["id","assetId","objectId","kind"]}
deps:
  - kind: reference
    to: data.media.media-asset
    label: {zh: "assetId→media-asset.id，多对一", en: "assetId->media-asset.id,"}
  - kind: reference
    to: data.media.oss-object
    label: {zh: "objectId→oss-object.id，多对一", en: "objectId->oss-object.id,"}
---
