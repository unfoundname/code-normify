---
uid: 31c73d29
id: data.projection.feed-timeline
parent: data.projection
state: planned
tags: [planned, "worker:W-SOCIAL", "storage:search"]
name: {zh: "动态流投影", en: "Feed timeline projection"}
description:
  zh: >
      关注动态流与已读去重
  en: >
      Following feed projections with read dedupe
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/ops/models/feed_timeline.model.sql"
apis:
  - protocol: rpc
    path: "db.table.projection_feed_timeline"
    description:
      zh: >
          权威表 projection_feed_timeline（唯一业务写入所有者：W-SOCIAL；RDS 方言与适配器待定）
      en: >
          Authoritative table projection_feed_timeline (sole write owner: W-SOCIAL; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/ops/models/feed_timeline.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "FeedTimelineRow"
    description: {zh: "关注动态流与已读去重", en: "Following feed projections with read dedupe"}
    schema: {"type":"object","additionalProperties":false,"description":"关注动态流与已读去重 / Following feed projections with read dedupe｜存储归属 SEARCH｜唯一写入所有者 W-SOCIAL｜表 projection_feed_timeline；主键 PK(id)；唯一约束 UNIQUE(userId,postId)；索引 INDEX(userId,rank)；外键 FK(userId→data.identity.user.id, postId→data.social.dynamic-post.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"userId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"postId":{"type":"string","description":"外键指向 data.social.dynamic-post.id（多对一，由 RDS 实施） / Foreign key to data.social.dynamic-post.id (many-to-one, enforced by RDS)"},"rank":{"type":"number","description":"rank 字段 / Field rank"},"insertedAt":{"type":"string","format":"date-time","description":"insertedAt 字段 / Field insertedAt"}},"required":["id","userId","postId","rank","insertedAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "userId→user.id，多对一", en: "userId->user.id, many-to-one"}
  - kind: reference
    to: data.social.dynamic-post
    label: {zh: "postId→dynamic-post.id，多对一", en: "postId->dynamic-post.id,"}
---
