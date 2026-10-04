---
uid: 2c0ad4bf
id: data.social.t-bb24aade
parent: data.social
state: planned
tags: ["worker:soc-feed", "projection:data-contract"]
name: {zh: "FeedPage", en: "FeedPage"}
description:
  zh: >
      动态流分页
  en: >
      Feed page
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/social/t-bb24aade.json"
apis: []
types:
  - name: "FeedPage"
    description: {zh: "动态流分页", en: "Feed page"}
    schema: {"type":"object","additionalProperties":false,"description":"关注流读权威+缓存，推荐流读投影","properties":{"items":{"type":"array","description":"动态条目","items":{"$ref":"urn:normify:data.social.t-91fbd4b1:DynamicRecord"}},"page":{"$ref":"urn:normify:data.contract.t-d48e49f1:PageMeta"},"kind":{"type":"string","enum":["following","recommend","topic","user","collection"],"description":"流类型"},"rankingVersion":{"type":"string","description":"排序策略版本"},"source":{"type":"string","enum":["authoritative","projection"],"description":"数据来源"}},"required":["items","page","kind","source"]}
deps:
  - kind: reference
    to: data.social.t-91fbd4b1
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-d48e49f1
    label: {zh: "类型引用", en: "Type reference"}
---
