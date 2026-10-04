---
uid: 63a56c88
id: data.community.like-record
parent: data.community
state: planned
tags: [planned, "worker:W-COMMUNITY", "storage:rds"]
name: {zh: "点赞记录", en: "Like record"}
description:
  zh: >
      多态目标的点赞关系
  en: >
      Likes over polymorphic targets
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/community/models/like_record.model.sql"
apis:
  - protocol: rpc
    path: "db.table.community_like_record"
    description:
      zh: >
          权威表 community_like_record（唯一业务写入所有者：W-COMMUNITY；RDS 方言与适配器待定）
      en: >
          Authoritative table community_like_record (sole write owner: W-COMMUNITY; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/community/models/like_record.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "LikeRecordRow"
    description: {zh: "多态目标的点赞关系", en: "Likes over polymorphic targets"}
    schema: {"type":"object","additionalProperties":false,"description":"多态目标的点赞关系 / Likes over polymorphic targets｜存储归属 RDS｜唯一写入所有者 W-COMMUNITY｜表 community_like_record；主键 PK(id)；唯一约束 UNIQUE(userId,targetId,targetType)；索引 INDEX(targetId,targetType)；外键 FK(userId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"userId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"targetId":{"type":"string","description":"targetId 字段 / Field targetId"},"targetType":{"type":"string","description":"targetType 字段 / Field targetType"},"createdAt":{"type":"string","format":"date-time","description":"createdAt 字段 / Field createdAt"}},"required":["id","userId","targetId","targetType","createdAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "userId→user.id，多对一", en: "userId->user.id, many-to-one"}
---
