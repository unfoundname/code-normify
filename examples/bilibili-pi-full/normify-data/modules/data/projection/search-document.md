---
uid: 120ba15b
id: data.projection.search-document
parent: data.projection
state: planned
tags: [planned, "worker:W-DISCOVER", "storage:search"]
name: {zh: "检索文档投影", en: "Search document projection"}
description:
  zh: >
      由发布事件派生的搜索文档（搜索服务持有）
  en: >
      Search documents derived from publish events and held by the search service
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/ops/models/search_document.model.sql"
apis:
  - protocol: rpc
    path: "db.table.projection_search_document"
    description:
      zh: >
          权威表 projection_search_document（唯一业务写入所有者：W-DISCOVER；RDS 方言与适配器待定）
      en: >
          Authoritative table projection_search_document (sole write owner: W-DISCOVER; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/ops/models/search_document.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "SearchDocumentRow"
    description: {zh: "由发布事件派生的搜索文档（搜索服务持有）", en: "Search documents derived from publish events and held by the search service"}
    schema: {"type":"object","additionalProperties":false,"description":"由发布事件派生的搜索文档（搜索服务持有） / Search documents derived from publish events and held by the search service｜存储归属 SEARCH｜唯一写入所有者 W-DISCOVER｜表 projection_search_document；主键 PK(id)；唯一约束 UNIQUE(bvid)；索引 INDEX(partitionId,score)；外键 FK(bvid→data.content.video.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"bvid":{"type":"string","description":"外键指向 data.content.video.id（多对一，由 RDS 实施） / Foreign key to data.content.video.id (many-to-one, enforced by RDS)"},"title":{"type":"string","description":"title 字段 / Field title"},"tagNames":{"type":"array","items":{"type":"string"},"description":"tagNames 字段 / Field tagNames"},"uploaderMid":{"type":"string","description":"uploaderMid 字段 / Field uploaderMid"},"partitionId":{"type":"string","description":"partitionId 字段 / Field partitionId"},"durationMs":{"type":"integer","description":"durationMs 字段 / Field durationMs"},"score":{"type":"number","description":"score 字段 / Field score"},"auditState":{"type":"string","enum":["PENDING","PASSED","REJECTED","ESCALATED","APPEALING"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"indexedAt":{"type":"string","format":"date-time","description":"indexedAt 字段 / Field indexedAt"}},"required":["id","bvid","title","tagNames","uploaderMid","partitionId","durationMs","score","auditState","indexedAt"]}
deps:
  - kind: reference
    to: data.content.video
    label: {zh: "bvid→video.id，多对一", en: "bvid->video.id, many-to-one"}
---
