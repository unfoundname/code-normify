---
uid: a75a5c95
id: data.channel.manga-chapter
parent: data.channel
state: planned
tags: [planned, "worker:W-CHANNEL", "storage:rds"]
name: {zh: "漫画章节", en: "Manga chapter"}
description:
  zh: >
      章节页数与付费标记
  en: >
      Chapter page counts and paid flags
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/content-extra/models/manga_chapter.model.sql"
apis:
  - protocol: rpc
    path: "db.table.channel_manga_chapter"
    description:
      zh: >
          权威表 channel_manga_chapter（唯一业务写入所有者：W-CHANNEL；RDS 方言与适配器待定）
      en: >
          Authoritative table channel_manga_chapter (sole write owner: W-CHANNEL; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/content-extra/models/manga_chapter.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "MangaChapterRow"
    description: {zh: "章节页数与付费标记", en: "Chapter page counts and paid flags"}
    schema: {"type":"object","additionalProperties":false,"description":"章节页数与付费标记 / Chapter page counts and paid flags｜存储归属 RDS｜唯一写入所有者 W-CHANNEL｜表 channel_manga_chapter；主键 PK(id)；唯一约束 UNIQUE(mangaId,index)；无二级索引；外键 FK(mangaId→data.channel.manga.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"mangaId":{"type":"string","description":"外键指向 data.channel.manga.id（多对一，由 RDS 实施） / Foreign key to data.channel.manga.id (many-to-one, enforced by RDS)"},"index":{"type":"integer","description":"index 字段 / Field index"},"title":{"type":"string","description":"title 字段 / Field title"},"pageCount":{"type":"integer","description":"pageCount 字段 / Field pageCount"},"paid":{"type":"boolean","description":"paid 字段 / Field paid"},"priceAmount":{"type":"integer","description":"priceAmount 字段 / Field priceAmount"},"objectPrefix":{"type":"string","description":"objectPrefix 字段 / Field objectPrefix"}},"required":["id","mangaId","index","title","pageCount","paid","objectPrefix"]}
deps:
  - kind: reference
    to: data.channel.manga
    label: {zh: "mangaId→manga.id，多对一", en: "mangaId->manga.id, many-to-one"}
---
