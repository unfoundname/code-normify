---
uid: 4eb68254
id: bili.contract.core.paging
parent: bili.contract.core
state: planned
tags: ["worker:contract-core"]
name: {zh: "分页契约", en: "Paging Contract"}
description:
  zh: >
      唯一分页形态：游标 + pageSize 请求，nextCursor + total + hasMore 元信息；禁止第二套分页协议。
      
  en: >
      Single paging shape: cursor request with page meta response.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "packages/contracts/src/core/paging.ts"
  - path: "packages/contracts/tests/paging.test.ts"
apis: []
types:
  - name: "PageRequest"
    description: {zh: "统一分页请求", en: "Unified page request"}
    schema: {"type":"object","additionalProperties":false,"description":"所有列表接口统一使用","properties":{"cursor":{"type":"string","description":"上一页返回的游标，首页省略"},"pageSize":{"type":"integer","description":"每页条数","minimum":1,"maximum":100},"sort":{"type":"string","description":"排序键，如 publishedAt:desc"}},"required":["pageSize"]}
  - name: "PageMeta"
    description: {zh: "统一分页元信息", en: "Unified page meta"}
    schema: {"type":"object","additionalProperties":false,"description":"所有列表响应统一携带","properties":{"nextCursor":{"type":"string","description":"下一页游标，无下一页时省略"},"total":{"type":"integer","description":"命中总数（投影查询可为近似值）","minimum":0},"hasMore":{"type":"boolean","description":"是否还有下一页"},"partial":{"type":"boolean","description":"结果是否降级/截断"}},"required":["hasMore"]}
  - name: "SortDirection"
    description: {zh: "排序方向", en: "Sort direction"}
    schema: {"type":"string","enum":["asc","desc"],"description":"排序方向"}
---
