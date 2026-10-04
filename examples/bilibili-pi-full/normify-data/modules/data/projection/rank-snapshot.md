---
uid: 501df614
id: data.projection.rank-snapshot
parent: data.projection
state: planned
tags: [planned, "worker:W-DISCOVER", "storage:search"]
name: {zh: "榜单快照投影", en: "Rank snapshot projection"}
description:
  zh: >
      榜单周期快照与位次
  en: >
      Periodic rank snapshots and positions
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/ops/models/rank_snapshot.model.sql"
apis:
  - protocol: rpc
    path: "db.table.projection_rank_snapshot"
    description:
      zh: >
          权威表 projection_rank_snapshot（唯一业务写入所有者：W-DISCOVER；RDS 方言与适配器待定）
      en: >
          Authoritative table projection_rank_snapshot (sole write owner: W-DISCOVER; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/ops/models/rank_snapshot.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "RankSnapshotRow"
    description: {zh: "榜单周期快照与位次", en: "Periodic rank snapshots and positions"}
    schema: {"type":"object","additionalProperties":false,"description":"榜单周期快照与位次 / Periodic rank snapshots and positions｜存储归属 SEARCH｜唯一写入所有者 W-DISCOVER｜表 projection_rank_snapshot；主键 PK(id)；唯一约束 UNIQUE(rankType,periodStart,bvid)；无二级索引；外键 FK(bvid→data.content.video.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"rankType":{"type":"string","enum":["ALL","PARTITION","WEEKLY","MONTHLY","RISING"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"periodStart":{"type":"string","format":"date-time","description":"periodStart 字段 / Field periodStart"},"bvid":{"type":"string","description":"外键指向 data.content.video.id（多对一，由 RDS 实施） / Foreign key to data.content.video.id (many-to-one, enforced by RDS)"},"position":{"type":"integer","description":"position 字段 / Field position"},"score":{"type":"number","description":"score 字段 / Field score"}},"required":["id","rankType","periodStart","bvid","position","score"]}
deps:
  - kind: reference
    to: data.content.video
    label: {zh: "bvid→video.id，多对一", en: "bvid->video.id, many-to-one"}
---
