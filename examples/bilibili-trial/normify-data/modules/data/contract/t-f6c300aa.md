---
uid: 68f4b8aa
id: data.contract.t-f6c300aa
parent: data.contract
state: planned
tags: ["worker:contract-core", "projection:data-contract"]
name: {zh: "PageRequest", en: "PageRequest"}
description:
  zh: >
      统一分页请求
  en: >
      Unified page request
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/contract/t-f6c300aa.json"
apis: []
types:
  - name: "PageRequest"
    description: {zh: "统一分页请求", en: "Unified page request"}
    schema: {"type":"object","additionalProperties":false,"description":"所有列表接口统一使用","properties":{"cursor":{"type":"string","description":"上一页返回的游标，首页省略"},"pageSize":{"type":"integer","description":"每页条数","minimum":1,"maximum":100},"sort":{"type":"string","description":"排序键，如 publishedAt:desc"}},"required":["pageSize"]}
---
