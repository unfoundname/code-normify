---
uid: c5baf05b
id: bili.channel.manga
parent: bili.channel
state: planned
tags: [planned, "worker:W-CHANNEL", leaf]
name: {zh: "漫画", en: "Manga"}
description:
  zh: >
      漫画作品、章节、图片分页阅读与付费章节
  en: >
      Manga works, chapters, paged reading and paid chapters
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/channel/manga/src/manga.ts"
  - path: "services/channel/manga/tests/manga.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/channel/manga/chapters/"
    description:
      zh: >
          查询漫画章节
      en: >
          Get a manga chapter
    output: {module: "bili.channel.manga", name: "MangaChapter"}
types:
  - name: "MangaChapter"
    description: {zh: "漫画章节", en: "Manga chapter"}
    schema: {"type":"object","description":"漫画章节 / Manga chapter","additionalProperties":false,"properties":{"chapterId":{"$ref":"urn:normify:bili.contract.common:Id","description":"章节 ID / Chapter id"},"mangaId":{"$ref":"urn:normify:bili.contract.common:Id","description":"漫画 ID / Manga id"},"index":{"type":"integer","description":"字段 index（语义见对应领域契约） / Field index"},"title":{"type":"string","minLength":1,"description":"标题 / Title"},"pageCount":{"type":"integer","description":"字段 pageCount（语义见对应领域契约） / Field pageCount"},"paid":{"type":"boolean","description":"字段 paid（语义见对应领域契约） / Field paid"},"price":{"$ref":"urn:normify:bili.contract.common:Money","description":"字段 price（语义见对应领域契约） / Field price"}},"required":["chapterId","mangaId","index","title","pageCount","paid"]}
deps:
  - kind: call
    to: bili.commerce.vip
    label: {zh: "付费章节权益校验", en: "Paid chapter entitlement check"}
  - kind: call
    to: bili.media.storage
    label: {zh: "章节图片对象存储", en: "Chapter image object storage"}
  - kind: call
    to: bili.infra.db
    label: {zh: "事务读写与表所有权校验", en: "Transactional persistence and"}
  - kind: event
    to: bili.infra.outbox
    label: {zh: "异步事件出箱与重试", en: "Async event outbox and retry"}
  - kind: reference
    to: bili.contract.common
    label: {zh: "统一 ID/时间/分页/错误契约", en: "Unified id, time, pagination"}
---
