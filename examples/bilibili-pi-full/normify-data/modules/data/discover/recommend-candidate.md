---
uid: 98aa224d
id: data.discover.recommend-candidate
parent: data.discover
state: planned
tags: [planned, "worker:W-DISCOVER", "storage:rds"]
name: {zh: "推荐候选", en: "Recommendation candidate"}
description:
  zh: >
      召回候选、场景与特征快照
  en: >
      Recall candidates, scenes and feature snapshots
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/ops/models/recommend_candidate.model.sql"
apis:
  - protocol: rpc
    path: "db.table.discover_recommend_candidate"
    description:
      zh: >
          权威表 discover_recommend_candidate（唯一业务写入所有者：W-DISCOVER；RDS 方言与适配器待定）
      en: >
          Authoritative table discover_recommend_candidate (sole write owner: W-DISCOVER; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/ops/models/recommend_candidate.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "RecommendCandidateRow"
    description: {zh: "召回候选、场景与特征快照", en: "Recall candidates, scenes and feature snapshots"}
    schema: {"type":"object","additionalProperties":false,"description":"召回候选、场景与特征快照 / Recall candidates, scenes and feature snapshots｜存储归属 RDS｜唯一写入所有者 W-DISCOVER｜表 discover_recommend_candidate；主键 PK(id)；无唯一约束；索引 INDEX(userId,scene,score)；外键 FK(userId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"userId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"scene":{"type":"string","description":"scene 字段 / Field scene"},"resourceId":{"type":"string","description":"resourceId 字段 / Field resourceId"},"score":{"type":"number","description":"score 字段 / Field score"},"reason":{"type":"string","enum":["HOT","FOLLOW","EMBEDDING","EDITORIAL","RELATED"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"generatedAt":{"type":"string","format":"date-time","description":"generatedAt 字段 / Field generatedAt"}},"required":["id","scene","resourceId","score","reason","generatedAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "userId→user.id，多对一", en: "userId->user.id, many-to-one"}
---
