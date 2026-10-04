---
uid: 4ecb9a85
id: data.content.draft-version
parent: data.content
state: planned
tags: [planned, "worker:W-CONTENT", "storage:rds"]
name: {zh: "草稿版本", en: "Draft version"}
description:
  zh: >
      草稿自动保存历史与差异
  en: >
      Draft autosave history and diffs
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/content/models/draft_version.model.sql"
apis:
  - protocol: rpc
    path: "db.table.content_draft_version"
    description:
      zh: >
          权威表 content_draft_version（唯一业务写入所有者：W-CONTENT；RDS 方言与适配器待定）
      en: >
          Authoritative table content_draft_version (sole write owner: W-CONTENT; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/content/models/draft_version.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "DraftVersionRow"
    description: {zh: "草稿自动保存历史与差异", en: "Draft autosave history and diffs"}
    schema: {"type":"object","additionalProperties":false,"description":"草稿自动保存历史与差异 / Draft autosave history and diffs｜存储归属 RDS｜唯一写入所有者 W-CONTENT｜表 content_draft_version；主键 PK(id)；唯一约束 UNIQUE(draftId,versionNo)；无二级索引；外键 FK(draftId→data.content.video-draft.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"draftId":{"type":"string","description":"外键指向 data.content.video-draft.id（多对一，由 RDS 实施） / Foreign key to data.content.video-draft.id (many-to-one, enforced by RDS)"},"versionNo":{"type":"integer","description":"versionNo 字段 / Field versionNo"},"snapshotJson":{"type":"object","additionalProperties":true,"description":"snapshotJson 字段 / Field snapshotJson"},"createdAt":{"type":"string","format":"date-time","description":"createdAt 字段 / Field createdAt"}},"required":["id","draftId","versionNo","snapshotJson","createdAt"]}
deps:
  - kind: reference
    to: data.content.video-draft
    label: {zh: "draftId→video-draft.id，多对一", en: "draftId->video-draft.id,"}
---
