---
uid: dd7f7975
id: data.social.dynamic-post
parent: data.social
state: planned
tags: [planned, "worker:W-SOCIAL", "storage:rds"]
name: {zh: "动态", en: "Dynamic post"}
description:
  zh: >
      图文/视频/转发动态
  en: >
      Text, image, video and forwarded posts
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/community/models/dynamic_post.model.sql"
apis:
  - protocol: rpc
    path: "db.table.social_dynamic_post"
    description:
      zh: >
          权威表 social_dynamic_post（唯一业务写入所有者：W-SOCIAL；RDS 方言与适配器待定）
      en: >
          Authoritative table social_dynamic_post (sole write owner: W-SOCIAL; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/community/models/dynamic_post.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "DynamicPostRow"
    description: {zh: "图文/视频/转发动态", en: "Text, image, video and forwarded posts"}
    schema: {"type":"object","additionalProperties":false,"description":"图文/视频/转发动态 / Text, image, video and forwarded posts｜存储归属 RDS｜唯一写入所有者 W-SOCIAL｜表 social_dynamic_post；主键 PK(id)；无唯一约束；索引 INDEX(authorId,createdAt), INDEX(forwardOfId)；外键 FK(authorId→data.identity.user.id, forwardOfId→data.social.dynamic-post.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"authorId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"kind":{"type":"string","enum":["TEXT","IMAGE","VIDEO","FORWARD","COLLECTION"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"textContent":{"type":"string","description":"textContent 字段 / Field textContent"},"forwardOfId":{"type":"string","description":"外键指向 data.social.dynamic-post.id（多对一，由 RDS 实施） / Foreign key to data.social.dynamic-post.id (many-to-one, enforced by RDS)"},"visibility":{"type":"string","enum":["PUBLIC","FOLLOWERS_ONLY","UNLISTED","PRIVATE","PAID_ONLY","REGION_LOCKED"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"likeCount":{"type":"integer","description":"likeCount 字段 / Field likeCount"},"commentCount":{"type":"integer","description":"commentCount 字段 / Field commentCount"},"createdAt":{"type":"string","format":"date-time","description":"createdAt 字段 / Field createdAt"}},"required":["id","authorId","kind","visibility","likeCount","commentCount","createdAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "authorId→user.id，多对一", en: "authorId->user.id, many-to-one"}
---
