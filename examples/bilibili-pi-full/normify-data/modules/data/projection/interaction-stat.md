---
uid: 83f9d110
id: data.projection.interaction-stat
parent: data.projection
state: planned
tags: [planned, "worker:W-COMMUNITY", "storage:search"]
name: {zh: "互动统计投影", en: "Interaction stat projection"}
description:
  zh: >
      点赞/投币/收藏/评论计数的投影
  en: >
      Projected like, coin, favorite and comment counters
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/ops/models/interaction_stat.model.sql"
apis:
  - protocol: rpc
    path: "db.table.projection_interaction_stat"
    description:
      zh: >
          权威表 projection_interaction_stat（唯一业务写入所有者：W-COMMUNITY；RDS 方言与适配器待定）
      en: >
          Authoritative table projection_interaction_stat (sole write owner: W-COMMUNITY; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/ops/models/interaction_stat.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "InteractionStatRow"
    description: {zh: "点赞/投币/收藏/评论计数的投影", en: "Projected like, coin, favorite and comment counters"}
    schema: {"type":"object","additionalProperties":false,"description":"点赞/投币/收藏/评论计数的投影 / Projected like, coin, favorite and comment counters｜存储归属 SEARCH｜唯一写入所有者 W-COMMUNITY｜表 projection_interaction_stat；主键 PK(id)；唯一约束 UNIQUE(targetId,targetType)；无二级索引；无外键｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"targetId":{"type":"string","description":"targetId 字段 / Field targetId"},"targetType":{"type":"string","description":"targetType 字段 / Field targetType"},"likeCount":{"type":"integer","description":"likeCount 字段 / Field likeCount"},"coinCount":{"type":"integer","description":"coinCount 字段 / Field coinCount"},"favoriteCount":{"type":"integer","description":"favoriteCount 字段 / Field favoriteCount"},"shareCount":{"type":"integer","description":"shareCount 字段 / Field shareCount"},"replyCount":{"type":"integer","description":"replyCount 字段 / Field replyCount"},"updatedAt":{"type":"string","format":"date-time","description":"updatedAt 字段 / Field updatedAt"}},"required":["id","targetId","targetType","likeCount","coinCount","favoriteCount","shareCount","replyCount","updatedAt"]}
---
