---
uid: c5765ce3
id: bili.ecosystem.manga
parent: bili.ecosystem
state: planned
tags: ["worker:eco-manga"]
name: {zh: "漫画", en: "Manga"}
description:
  zh: >
      漫画作品与章节、页序与图片资源、章节付费与解锁、追更与评分。
      
  en: >
      Manga titles and chapters, page ordering, paid chapters and unlocks, follows and ratings.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/ecosystem/manga/src/service.ts"
  - path: "services/ecosystem/manga/migrations/0001_manga.sql"
  - path: "services/ecosystem/manga/tests/manga.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/manga/{id}"
    description:
      zh: >
          读取漫画作品
          
      en: >
          Get manga
          
    output: {module: "bili.ecosystem.manga", name: "MangaRecord"}
  - protocol: http
    method: GET
    path: "/api/v1/manga/{id}/chapters"
    description:
      zh: >
          列出章节
          
      en: >
          List chapters
          
    output: {module: "bili.ecosystem.manga", name: "MangaChapter"}
  - protocol: http
    method: POST
    path: "/api/v1/manga/chapters/{id}/unlock"
    description:
      zh: >
          解锁付费章节
          
      en: >
          Unlock chapter
          
    input: {module: "bili.contract.core.idempotency", name: "IdempotencyKey"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: mysql
    path: "manga_chapter"
    description:
      zh: >
          漫画章节表（唯一写入所有者：漫画服务）
          
      en: >
          manga_chapter table
          
types:
  - name: "MangaRecord"
    description: {zh: "漫画作品", en: "Manga title"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 manga","properties":{"mangaId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"title":{"type":"string","description":"标题","maxLength":120},"authorName":{"type":"string","description":"作者"},"coverAssetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"description":{"type":"string","description":"简介","maxLength":2000},"state":{"type":"string","enum":["serializing","finished","paused","offline"],"description":"状态"},"totalChapters":{"type":"integer","description":"章节数（投影）","minimum":0},"tags":{"type":"array","description":"标签","items":{"type":"string","description":"标签"}},"ratingAverage":{"type":"integer","description":"平均分 ×10","minimum":0,"maximum":100}},"required":["mangaId","title","authorName","state"]}
  - name: "MangaChapter"
    description: {zh: "漫画章节", en: "Manga chapter"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 manga_chapter，唯一约束 manga_id+chapter_index","properties":{"chapterId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"mangaId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"chapterIndex":{"type":"integer","description":"章节序号","minimum":0},"title":{"type":"string","description":"章节标题","maxLength":120},"pageAssetIds":{"type":"array","description":"页面图片资产（按顺序）","items":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"minItems":1},"state":{"type":"string","enum":["draft","in_review","published","locked","vip","offline"],"description":"状态机"},"publishedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"unlockPrice":{"$ref":"urn:normify:bili.contract.core.ids:MoneyAmount"}},"required":["chapterId","mangaId","chapterIndex","pageAssetIds","state"]}
deps:
  - kind: call
    to: bili.media.asset
    label: {zh: "页面图片存 OSS", en: "Page images on OSS"}
  - kind: call
    to: bili.premium.entitlement
    label: {zh: "章节解锁与权益判定", en: "Chapter entitlement"}
  - kind: call
    to: bili.ops.review
    label: {zh: "漫画内容审核", en: "Manga review"}
  - kind: call
    to: bili.social.message
    label: {zh: "追更通知", en: "Update notifications"}
---
