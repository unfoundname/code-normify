---
uid: eed130af
id: data.content.collection
parent: data.content
state: planned
tags: [planned, "worker:W-CONTENT", "storage:rds"]
name: {zh: "视频合集", en: "Video collection"}
description:
  zh: >
      合集信息、归属与排序
  en: >
      Collection metadata, ownership and ordering
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/content/models/collection.model.sql"
apis:
  - protocol: rpc
    path: "db.table.content_collection"
    description:
      zh: >
          权威表 content_collection（唯一业务写入所有者：W-CONTENT；RDS 方言与适配器待定）
      en: >
          Authoritative table content_collection (sole write owner: W-CONTENT; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/content/models/collection.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "CollectionRow"
    description: {zh: "合集信息、归属与排序", en: "Collection metadata, ownership and ordering"}
    schema: {"type":"object","additionalProperties":false,"description":"合集信息、归属与排序 / Collection metadata, ownership and ordering｜存储归属 RDS｜唯一写入所有者 W-CONTENT｜表 content_collection；主键 PK(id)；无唯一约束；索引 INDEX(ownerId)；外键 FK(ownerId→data.identity.user.id, coverAssetId→data.media.media-asset.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"ownerId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"title":{"type":"string","description":"title 字段 / Field title"},"coverAssetId":{"type":"string","description":"外键指向 data.media.media-asset.id（多对一，由 RDS 实施） / Foreign key to data.media.media-asset.id (many-to-one, enforced by RDS)"},"itemCount":{"type":"integer","description":"itemCount 字段 / Field itemCount"},"updatedAt":{"type":"string","format":"date-time","description":"updatedAt 字段 / Field updatedAt"}},"required":["id","ownerId","title","itemCount","updatedAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "ownerId→user.id，多对一", en: "ownerId->user.id, many-to-one"}
  - kind: reference
    to: data.media.media-asset
    label: {zh: "coverAssetId→media-asset.id，多对", en: "coverAssetId->media-asset.id,"}
---
