---
uid: bf389712
id: data.discovery.t-46fa6adc
parent: data.discovery
state: planned
tags: ["worker:disc-search", "projection:data-contract"]
name: {zh: "SearchSuggestion", en: "SearchSuggestion"}
description:
  zh: >
      搜索建议
  en: >
      Search suggestion
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/discovery/t-46fa6adc.json"
apis: []
types:
  - name: "SearchSuggestion"
    description: {zh: "搜索建议", en: "Search suggestion"}
    schema: {"type":"object","additionalProperties":false,"properties":{"text":{"type":"string","description":"建议文本","maxLength":60},"type":{"type":"string","enum":["keyword","user","video","topic","hot"],"description":"类型"},"highlight":{"type":"string","description":"高亮片段"},"score":{"type":"integer","description":"排序分","minimum":0}},"required":["text","type","score"]}
---
