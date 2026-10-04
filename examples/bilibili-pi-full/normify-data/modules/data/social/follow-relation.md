---
uid: 899424af
id: data.social.follow-relation
parent: data.social
state: planned
tags: [planned, "worker:W-SOCIAL", "storage:rds"]
name: {zh: "关注关系", en: "Follow relation"}
description:
  zh: >
      关注与粉丝的权威关系
  en: >
      Authoritative follow and fan relations
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/community/models/follow_relation.model.sql"
apis:
  - protocol: rpc
    path: "db.table.social_follow_relation"
    description:
      zh: >
          权威表 social_follow_relation（唯一业务写入所有者：W-SOCIAL；RDS 方言与适配器待定）
      en: >
          Authoritative table social_follow_relation (sole write owner: W-SOCIAL; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/community/models/follow_relation.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "FollowRelationRow"
    description: {zh: "关注与粉丝的权威关系", en: "Authoritative follow and fan relations"}
    schema: {"type":"object","additionalProperties":false,"description":"关注与粉丝的权威关系 / Authoritative follow and fan relations｜存储归属 RDS｜唯一写入所有者 W-SOCIAL｜表 social_follow_relation；主键 PK(id)；唯一约束 UNIQUE(followerId,followedUserId)；索引 INDEX(followedUserId)；外键 FK(followerId→data.identity.user.id, followedUserId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"followerId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"followedUserId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"relationType":{"type":"string","enum":["PUBLIC","SPECIAL","MUTUAL"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"createdAt":{"type":"string","format":"date-time","description":"createdAt 字段 / Field createdAt"}},"required":["id","followerId","followedUserId","relationType","createdAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "followerId→user.id+followedUse", en: "followerId->user.id+followedUs"}
---
