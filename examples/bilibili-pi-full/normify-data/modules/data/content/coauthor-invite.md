---
uid: adb1790a
id: data.content.coauthor-invite
parent: data.content
state: planned
tags: [planned, "worker:W-CONTENT", "storage:rds"]
name: {zh: "联合投稿邀请", en: "Co-author invite"}
description:
  zh: >
      邀请、权重与状态
  en: >
      Invitations, weights and status
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/content/models/coauthor_invite.model.sql"
apis:
  - protocol: rpc
    path: "db.table.content_coauthor_invite"
    description:
      zh: >
          权威表 content_coauthor_invite（唯一业务写入所有者：W-CONTENT；RDS 方言与适配器待定）
      en: >
          Authoritative table content_coauthor_invite (sole write owner: W-CONTENT; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/content/models/coauthor_invite.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "CoauthorInviteRow"
    description: {zh: "邀请、权重与状态", en: "Invitations, weights and status"}
    schema: {"type":"object","additionalProperties":false,"description":"邀请、权重与状态 / Invitations, weights and status｜存储归属 RDS｜唯一写入所有者 W-CONTENT｜表 content_coauthor_invite；主键 PK(id)；无唯一约束；索引 INDEX(draftId,status)；外键 FK(draftId→data.content.video-draft.id, inviterId→data.identity.user.id, inviteeUserId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"draftId":{"type":"string","description":"外键指向 data.content.video-draft.id（多对一，由 RDS 实施） / Foreign key to data.content.video-draft.id (many-to-one, enforced by RDS)"},"inviterId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"inviteeUserId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"weightPercent":{"type":"integer","description":"weightPercent 字段 / Field weightPercent"},"status":{"type":"string","enum":["PENDING","ACCEPTED","REJECTED","EXPIRED"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"expireAt":{"type":"string","format":"date-time","description":"expireAt 字段 / Field expireAt"}},"required":["id","draftId","inviterId","inviteeUserId","weightPercent","status","expireAt"]}
deps:
  - kind: reference
    to: data.content.video-draft
    label: {zh: "draftId→video-draft.id，多对一", en: "draftId->video-draft.id,"}
  - kind: reference
    to: data.identity.user
    label: {zh: "inviterId→user.id+inviteeUserI", en: "inviterId->user.id+inviteeUser"}
---
