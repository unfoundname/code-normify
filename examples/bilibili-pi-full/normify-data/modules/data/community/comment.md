---
uid: 3db4f102
id: data.community.comment
parent: data.community
state: planned
tags: [planned, "worker:W-COMMUNITY", "storage:rds"]
name: {zh: "评论", en: "Comment"}
description:
  zh: >
      评论与回复（层级由 parentId 自引用表达，跨行约束由 RDS 实施）
  en: >
      Comments and replies; nesting uses a self parentId validated by RDS
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/community/models/comment.model.sql"
apis:
  - protocol: rpc
    path: "db.table.community_comment"
    description:
      zh: >
          权威表 community_comment（唯一业务写入所有者：W-COMMUNITY；RDS 方言与适配器待定）
      en: >
          Authoritative table community_comment (sole write owner: W-COMMUNITY; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/community/models/comment.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "CommentRow"
    description: {zh: "评论与回复（层级由 parentId 自引用表达，跨行约束由 RDS 实施）", en: "Comments and replies; nesting uses a self parentId validated by RDS"}
    schema: {"type":"object","additionalProperties":false,"description":"评论与回复（层级由 parentId 自引用表达，跨行约束由 RDS 实施） / Comments and replies; nesting uses a self parentId validated by RDS｜存储归属 RDS｜唯一写入所有者 W-COMMUNITY｜表 community_comment；主键 PK(id)；无唯一约束；索引 INDEX(targetId,targetType,createdAt), INDEX(authorId), INDEX(rootId), INDEX(parentId)；外键 FK(authorId→data.identity.user.id, rootId→data.community.comment.id, parentId→data.community.comment.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"targetId":{"type":"string","description":"targetId 字段 / Field targetId"},"targetType":{"type":"string","description":"targetType 字段 / Field targetType"},"authorId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"rootId":{"type":"string","description":"外键指向 data.community.comment.id（多对一，由 RDS 实施） / Foreign key to data.community.comment.id (many-to-one, enforced by RDS)"},"parentId":{"type":"string","description":"外键指向 data.community.comment.id（多对一，由 RDS 实施） / Foreign key to data.community.comment.id (many-to-one, enforced by RDS)"},"content":{"type":"string","description":"content 字段 / Field content"},"auditState":{"type":"string","enum":["PENDING","PASSED","REJECTED","ESCALATED","APPEALING"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"likeCount":{"type":"integer","description":"likeCount 字段 / Field likeCount"},"replyCount":{"type":"integer","description":"replyCount 字段 / Field replyCount"},"createdAt":{"type":"string","format":"date-time","description":"createdAt 字段 / Field createdAt"}},"required":["id","targetId","targetType","authorId","content","auditState","likeCount","replyCount","createdAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "authorId→user.id，多对一", en: "authorId->user.id, many-to-one"}
---
