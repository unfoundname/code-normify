---
uid: aed5f583
id: data.community.favorite-item
parent: data.community
state: planned
tags: [planned, "worker:W-COMMUNITY", "storage:rds"]
name: {zh: "收藏条目", en: "Favorite item"}
description:
  zh: >
      收藏夹内的多态资源条目
  en: >
      Polymorphic resources inside a favorite folder
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/community/models/favorite_item.model.sql"
apis:
  - protocol: rpc
    path: "db.table.community_favorite_item"
    description:
      zh: >
          权威表 community_favorite_item（唯一业务写入所有者：W-COMMUNITY；RDS 方言与适配器待定）
      en: >
          Authoritative table community_favorite_item (sole write owner: W-COMMUNITY; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/community/models/favorite_item.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "FavoriteItemRow"
    description: {zh: "收藏夹内的多态资源条目", en: "Polymorphic resources inside a favorite folder"}
    schema: {"type":"object","additionalProperties":false,"description":"收藏夹内的多态资源条目 / Polymorphic resources inside a favorite folder｜存储归属 RDS｜唯一写入所有者 W-COMMUNITY｜表 community_favorite_item；主键 PK(id)；唯一约束 UNIQUE(folderId,targetId,targetType)；无二级索引；外键 FK(folderId→data.community.favorite-folder.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"folderId":{"type":"string","description":"外键指向 data.community.favorite-folder.id（多对一，由 RDS 实施） / Foreign key to data.community.favorite-folder.id (many-to-one, enforced by RDS)"},"targetId":{"type":"string","description":"targetId 字段 / Field targetId"},"targetType":{"type":"string","description":"targetType 字段 / Field targetType"},"createdAt":{"type":"string","format":"date-time","description":"createdAt 字段 / Field createdAt"}},"required":["id","folderId","targetId","targetType","createdAt"]}
deps:
  - kind: reference
    to: data.community.favorite-folder
    label: {zh: "folderId→favorite-folder.id，多对", en: "folderId->favorite-folder.id,"}
---
