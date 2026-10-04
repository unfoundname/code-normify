---
uid: ee7ebed8
id: data.community.favorite-folder
parent: data.community
state: planned
tags: [planned, "worker:W-COMMUNITY", "storage:rds"]
name: {zh: "收藏夹", en: "Favorite folder"}
description:
  zh: >
      收藏夹与可见性
  en: >
      Favorite folders and visibility
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/community/models/favorite_folder.model.sql"
apis:
  - protocol: rpc
    path: "db.table.community_favorite_folder"
    description:
      zh: >
          权威表 community_favorite_folder（唯一业务写入所有者：W-COMMUNITY；RDS 方言与适配器待定）
      en: >
          Authoritative table community_favorite_folder (sole write owner: W-COMMUNITY; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/community/models/favorite_folder.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "FavoriteFolderRow"
    description: {zh: "收藏夹与可见性", en: "Favorite folders and visibility"}
    schema: {"type":"object","additionalProperties":false,"description":"收藏夹与可见性 / Favorite folders and visibility｜存储归属 RDS｜唯一写入所有者 W-COMMUNITY｜表 community_favorite_folder；主键 PK(id)；无唯一约束；索引 INDEX(ownerId)；外键 FK(ownerId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"ownerId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"title":{"type":"string","description":"title 字段 / Field title"},"visibility":{"type":"string","enum":["PUBLIC","FOLLOWERS_ONLY","UNLISTED","PRIVATE","PAID_ONLY","REGION_LOCKED"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"itemCount":{"type":"integer","description":"itemCount 字段 / Field itemCount"},"createdAt":{"type":"string","format":"date-time","description":"createdAt 字段 / Field createdAt"}},"required":["id","ownerId","title","visibility","itemCount","createdAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "ownerId→user.id，多对一", en: "ownerId->user.id, many-to-one"}
---
