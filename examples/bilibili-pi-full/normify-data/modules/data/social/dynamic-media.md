---
uid: d0891743
id: data.social.dynamic-media
parent: data.social
state: planned
tags: [planned, "worker:W-SOCIAL", "storage:rds"]
name: {zh: "动态媒体引用", en: "Dynamic media reference"}
description:
  zh: >
      动态附带的视频/图片/合集引用
  en: >
      Videos, images and collections attached to a post
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/community/models/dynamic_media.model.sql"
apis:
  - protocol: rpc
    path: "db.table.social_dynamic_media"
    description:
      zh: >
          权威表 social_dynamic_media（唯一业务写入所有者：W-SOCIAL；RDS 方言与适配器待定）
      en: >
          Authoritative table social_dynamic_media (sole write owner: W-SOCIAL; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/community/models/dynamic_media.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "DynamicMediaRow"
    description: {zh: "动态附带的视频/图片/合集引用", en: "Videos, images and collections attached to a post"}
    schema: {"type":"object","additionalProperties":false,"description":"动态附带的视频/图片/合集引用 / Videos, images and collections attached to a post｜存储归属 RDS｜唯一写入所有者 W-SOCIAL｜表 social_dynamic_media；主键 PK(id)；无唯一约束；索引 INDEX(postId)；外键 FK(postId→data.social.dynamic-post.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"postId":{"type":"string","description":"外键指向 data.social.dynamic-post.id（多对一，由 RDS 实施） / Foreign key to data.social.dynamic-post.id (many-to-one, enforced by RDS)"},"mediaType":{"type":"string","description":"mediaType 字段 / Field mediaType"},"resourceId":{"type":"string","description":"resourceId 字段 / Field resourceId"},"orderIndex":{"type":"integer","description":"orderIndex 字段 / Field orderIndex"}},"required":["id","postId","mediaType","resourceId","orderIndex"]}
deps:
  - kind: reference
    to: data.social.dynamic-post
    label: {zh: "postId→dynamic-post.id，多对一", en: "postId->dynamic-post.id,"}
---
