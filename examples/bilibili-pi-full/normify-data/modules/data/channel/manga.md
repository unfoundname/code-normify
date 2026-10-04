---
uid: bdc0ec15
id: data.channel.manga
parent: data.channel
state: planned
tags: [planned, "worker:W-CHANNEL", "storage:rds"]
name: {zh: "漫画", en: "Manga"}
description:
  zh: >
      漫画作品与更新状态
  en: >
      Manga works and update state
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/content-extra/models/manga.model.sql"
apis:
  - protocol: rpc
    path: "db.table.channel_manga"
    description:
      zh: >
          权威表 channel_manga（唯一业务写入所有者：W-CHANNEL；RDS 方言与适配器待定）
      en: >
          Authoritative table channel_manga (sole write owner: W-CHANNEL; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/content-extra/models/manga.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "MangaRow"
    description: {zh: "漫画作品与更新状态", en: "Manga works and update state"}
    schema: {"type":"object","additionalProperties":false,"description":"漫画作品与更新状态 / Manga works and update state｜存储归属 RDS｜唯一写入所有者 W-CHANNEL｜表 channel_manga；主键 PK(id)；无唯一约束；索引 INDEX(status,updatedAt)；外键 FK(authorId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"title":{"type":"string","description":"title 字段 / Field title"},"authorId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"status":{"type":"string","enum":["ONGOING","COMPLETED","PAUSED"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"chapterCount":{"type":"integer","description":"chapterCount 字段 / Field chapterCount"},"updatedAt":{"type":"string","format":"date-time","description":"updatedAt 字段 / Field updatedAt"}},"required":["id","title","authorId","status","chapterCount","updatedAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "authorId→user.id，多对一", en: "authorId->user.id, many-to-one"}
---
