---
uid: 3abb7cf0
id: data.content.video-part
parent: data.content
state: planned
tags: [planned, "worker:W-CONTENT", "storage:rds"]
name: {zh: "稿件分P", en: "Video part"}
description:
  zh: >
      分P顺序、时长与原件绑定
  en: >
      Part ordering, duration and source binding
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/content/models/video_part.model.sql"
apis:
  - protocol: rpc
    path: "db.table.content_video_part"
    description:
      zh: >
          权威表 content_video_part（唯一业务写入所有者：W-CONTENT；RDS 方言与适配器待定）
      en: >
          Authoritative table content_video_part (sole write owner: W-CONTENT; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/content/models/video_part.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "VideoPartRow"
    description: {zh: "分P顺序、时长与原件绑定", en: "Part ordering, duration and source binding"}
    schema: {"type":"object","additionalProperties":false,"description":"分P顺序、时长与原件绑定 / Part ordering, duration and source binding｜存储归属 RDS｜唯一写入所有者 W-CONTENT｜表 content_video_part；主键 PK(id)；唯一约束 UNIQUE(draftId,index)；索引 INDEX(assetId)；外键 FK(draftId→data.content.video-draft.id, assetId→data.media.media-asset.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"draftId":{"type":"string","description":"外键指向 data.content.video-draft.id（多对一，由 RDS 实施） / Foreign key to data.content.video-draft.id (many-to-one, enforced by RDS)"},"assetId":{"type":"string","description":"外键指向 data.media.media-asset.id（多对一，由 RDS 实施） / Foreign key to data.media.media-asset.id (many-to-one, enforced by RDS)"},"index":{"type":"integer","description":"index 字段 / Field index"},"title":{"type":"string","description":"title 字段 / Field title"},"durationMs":{"type":"integer","description":"durationMs 字段 / Field durationMs"}},"required":["id","draftId","assetId","index","title","durationMs"]}
deps:
  - kind: reference
    to: data.content.video-draft
    label: {zh: "draftId→video-draft.id，多对一", en: "draftId->video-draft.id,"}
  - kind: reference
    to: data.media.media-asset
    label: {zh: "assetId→media-asset.id，多对一", en: "assetId->media-asset.id,"}
---
