---
uid: 76a85e3c
id: data.ecosystem.t-3fa08d6f
parent: data.ecosystem
state: planned
tags: ["worker:eco-manga", "projection:data-contract"]
name: {zh: "MangaChapter", en: "MangaChapter"}
description:
  zh: >
      漫画章节
  en: >
      Manga chapter
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/ecosystem/t-3fa08d6f.json"
apis: []
types:
  - name: "MangaChapter"
    description: {zh: "漫画章节", en: "Manga chapter"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 manga_chapter，唯一约束 manga_id+chapter_index","properties":{"chapterId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"mangaId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"chapterIndex":{"type":"integer","description":"章节序号","minimum":0},"title":{"type":"string","description":"章节标题","maxLength":120},"pageAssetIds":{"type":"array","description":"页面图片资产（按顺序）","items":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"minItems":1},"state":{"type":"string","enum":["draft","in_review","published","locked","vip","offline"],"description":"状态机"},"publishedAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"},"unlockPrice":{"$ref":"urn:normify:data.contract.t-d2d2c734:MoneyAmount"}},"required":["chapterId","mangaId","chapterIndex","pageAssetIds","state"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-7a625dbd
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-d2d2c734
    label: {zh: "类型引用", en: "Type reference"}
---
