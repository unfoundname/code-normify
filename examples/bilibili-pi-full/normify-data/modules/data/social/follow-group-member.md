---
uid: 59940b6f
id: data.social.follow-group-member
parent: data.social
state: planned
tags: [planned, "worker:W-SOCIAL", "storage:rds"]
name: {zh: "分组成员", en: "Follow group member"}
description:
  zh: >
      分组与关注对象的成员关系
  en: >
      Membership between groups and followed users
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/community/models/follow_group_member.model.sql"
apis:
  - protocol: rpc
    path: "db.table.social_follow_group_member"
    description:
      zh: >
          权威表 social_follow_group_member（唯一业务写入所有者：W-SOCIAL；RDS 方言与适配器待定）
      en: >
          Authoritative table social_follow_group_member (sole write owner: W-SOCIAL; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/community/models/follow_group_member.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "FollowGroupMemberRow"
    description: {zh: "分组与关注对象的成员关系", en: "Membership between groups and followed users"}
    schema: {"type":"object","additionalProperties":false,"description":"分组与关注对象的成员关系 / Membership between groups and followed users｜存储归属 RDS｜唯一写入所有者 W-SOCIAL｜表 social_follow_group_member；主键 PK(id)；唯一约束 UNIQUE(groupId,followedUserId)；无二级索引；外键 FK(groupId→data.social.follow-group.id, followedUserId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"groupId":{"type":"string","description":"外键指向 data.social.follow-group.id（多对一，由 RDS 实施） / Foreign key to data.social.follow-group.id (many-to-one, enforced by RDS)"},"followedUserId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"addedAt":{"type":"string","format":"date-time","description":"addedAt 字段 / Field addedAt"}},"required":["id","groupId","followedUserId","addedAt"]}
deps:
  - kind: reference
    to: data.social.follow-group
    label: {zh: "groupId→follow-group.id，多对一", en: "groupId->follow-group.id,"}
  - kind: reference
    to: data.identity.user
    label: {zh: "followedUserId→user.id，多对一", en: "followedUserId->user.id,"}
---
