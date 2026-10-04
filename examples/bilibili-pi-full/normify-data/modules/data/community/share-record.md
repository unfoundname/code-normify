---
uid: 12f26d10
id: data.community.share-record
parent: data.community
state: planned
tags: [planned, "worker:W-COMMUNITY", "storage:rds"]
name: {zh: "分享记录", en: "Share record"}
description:
  zh: >
      分享渠道与短链
  en: >
      Share channels and short links
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/community/models/share_record.model.sql"
apis:
  - protocol: rpc
    path: "db.table.community_share_record"
    description:
      zh: >
          权威表 community_share_record（唯一业务写入所有者：W-COMMUNITY；RDS 方言与适配器待定）
      en: >
          Authoritative table community_share_record (sole write owner: W-COMMUNITY; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/community/models/share_record.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "ShareRecordRow"
    description: {zh: "分享渠道与短链", en: "Share channels and short links"}
    schema: {"type":"object","additionalProperties":false,"description":"分享渠道与短链 / Share channels and short links｜存储归属 RDS｜唯一写入所有者 W-COMMUNITY｜表 community_share_record；主键 PK(id)；无唯一约束；索引 INDEX(targetId,createdAt)；外键 FK(userId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"userId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"targetId":{"type":"string","description":"targetId 字段 / Field targetId"},"targetType":{"type":"string","description":"targetType 字段 / Field targetType"},"channel":{"type":"string","enum":["WEB","APP","WECHAT","QQ","COPY_LINK"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"shortUrl":{"type":"string","description":"shortUrl 字段 / Field shortUrl"},"createdAt":{"type":"string","format":"date-time","description":"createdAt 字段 / Field createdAt"}},"required":["id","targetId","targetType","channel","shortUrl","createdAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "userId→user.id，多对一", en: "userId->user.id, many-to-one"}
---
