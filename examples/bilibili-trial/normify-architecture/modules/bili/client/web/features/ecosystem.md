---
uid: 5eb1721b
id: bili.client.web.features.ecosystem
parent: bili.client.web.features
state: planned
tags: ["worker:web-eco"]
name: {zh: "生态频道前端", en: "Ecosystem Feature"}
description:
  zh: >
      专栏阅读与编辑、音频播放页与歌单、漫画阅读器、赛事页、会员购与装扮商店。
      
  en: >
      Article reading and editing, audio player and playlists, manga reader, esports pages, mall and dress-up store.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/web/src/features/ecosystem/index.ts"
  - path: "apps/web/src/features/ecosystem/pages/ArticlePage.tsx"
  - path: "apps/web/src/features/ecosystem/pages/MangaReaderPage.tsx"
  - path: "apps/web/src/features/ecosystem/tests/ecosystem.test.tsx"
apis: []
types:
  - name: "EcosystemChannelState"
    description: {zh: "生态频道状态", en: "Ecosystem channel state"}
    schema: {"type":"object","additionalProperties":false,"properties":{"channel":{"type":"string","enum":["article","audio","manga","esports","mall","dressup"],"description":"频道"},"article":{"$ref":"urn:normify:bili.ecosystem.article:ArticleRecord"},"audioPlaylist":{"$ref":"urn:normify:bili.ecosystem.audio:AudioPlaylist"},"mangaChapter":{"$ref":"urn:normify:bili.ecosystem.manga:MangaChapter"},"match":{"$ref":"urn:normify:bili.ecosystem.esports:EsportsMatch"},"mallProducts":{"type":"array","description":"会员购商品","items":{"$ref":"urn:normify:bili.ecosystem.mall:MallProduct"}},"dressupItems":{"type":"array","description":"装扮","items":{"$ref":"urn:normify:bili.ecosystem.dressup:DressupItem"}},"error":{"$ref":"urn:normify:bili.contract.core.errors:ApiError"}},"required":["channel"]}
  - name: "MangaReaderState"
    description: {zh: "漫画阅读器状态", en: "Manga reader state"}
    schema: {"type":"object","additionalProperties":false,"properties":{"mangaId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"chapter":{"$ref":"urn:normify:bili.ecosystem.manga:MangaChapter"},"pageIndex":{"type":"integer","description":"当前页","minimum":0},"direction":{"type":"string","enum":["rtl","ltr","vertical"],"description":"翻页方向"},"unlocked":{"type":"boolean","description":"是否已解锁"},"nextChapterId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"}},"required":["mangaId","pageIndex","unlocked"]}
deps:
  - kind: call
    to: bili.ecosystem.article
    to_api: "GET /api/v1/articles/{id}"
    label: {zh: "专栏内容", en: "Articles"}
  - kind: call
    to: bili.ecosystem.audio
    to_api: "GET /api/v1/audio/{id}"
    label: {zh: "音频与歌单", en: "Audio and playlists"}
  - kind: call
    to: bili.ecosystem.manga
    to_api: "GET /api/v1/manga/{id}"
    label: {zh: "漫画与章节解锁", en: "Manga and unlock"}
  - kind: call
    to: bili.ecosystem.esports
    to_api: "GET /api/v1/esports/matches/{id}"
    label: {zh: "赛事与赛果", en: "Esports"}
  - kind: call
    to: bili.ecosystem.mall
    to_api: "GET /api/v1/mall/products"
    label: {zh: "会员购商品", en: "Mall products"}
  - kind: call
    to: bili.ecosystem.dressup
    to_api: "GET /api/v1/dressup/items"
    label: {zh: "装扮商店与激活", en: "Dress-up store"}
---
