---
uid: 85d85a17
id: data.content.collection-item
parent: data.content
state: planned
tags: [planned, "worker:W-CONTENT", "storage:rds"]
name: {zh: "合集条目", en: "Collection item"}
description:
  zh: >
      合集内视频顺序
  en: >
      Video ordering inside a collection
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/content/models/collection_item.model.sql"
apis:
  - protocol: rpc
    path: "db.table.content_collection_item"
    description:
      zh: >
          权威表 content_collection_item（唯一业务写入所有者：W-CONTENT；RDS 方言与适配器待定）
      en: >
          Authoritative table content_collection_item (sole write owner: W-CONTENT; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/content/models/collection_item.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "CollectionItemRow"
    description: {zh: "合集内视频顺序", en: "Video ordering inside a collection"}
    schema: {"type":"object","additionalProperties":false,"description":"合集内视频顺序 / Video ordering inside a collection｜存储归属 RDS｜唯一写入所有者 W-CONTENT｜表 content_collection_item；主键 PK(id)；唯一约束 UNIQUE(collectionId,bvid)；索引 INDEX(bvid)；外键 FK(collectionId→data.content.collection.id, bvid→data.content.video.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"collectionId":{"type":"string","description":"外键指向 data.content.collection.id（多对一，由 RDS 实施） / Foreign key to data.content.collection.id (many-to-one, enforced by RDS)"},"bvid":{"type":"string","description":"外键指向 data.content.video.id（多对一，由 RDS 实施） / Foreign key to data.content.video.id (many-to-one, enforced by RDS)"},"orderIndex":{"type":"integer","description":"orderIndex 字段 / Field orderIndex"}},"required":["id","collectionId","bvid","orderIndex"]}
deps:
  - kind: reference
    to: data.content.collection
    label: {zh: "collectionId→collection.id，多对一", en: "collectionId->collection.id,"}
  - kind: reference
    to: data.content.video
    label: {zh: "bvid→video.id，多对一", en: "bvid->video.id, many-to-one"}
---
