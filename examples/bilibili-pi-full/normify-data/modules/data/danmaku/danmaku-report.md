---
uid: 88ceb29d
id: data.danmaku.danmaku-report
parent: data.danmaku
state: planned
tags: [planned, "worker:W-DANMAKU", "storage:rds"]
name: {zh: "弹幕举报", en: "Danmaku report"}
description:
  zh: >
      举报分类与证据快照
  en: >
      Report categories and evidence snapshots
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/community/models/danmaku_report.model.sql"
apis:
  - protocol: rpc
    path: "db.table.danmaku_report"
    description:
      zh: >
          权威表 danmaku_report（唯一业务写入所有者：W-DANMAKU；RDS 方言与适配器待定）
      en: >
          Authoritative table danmaku_report (sole write owner: W-DANMAKU; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/community/models/danmaku_report.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "DanmakuReportRow"
    description: {zh: "举报分类与证据快照", en: "Report categories and evidence snapshots"}
    schema: {"type":"object","additionalProperties":false,"description":"举报分类与证据快照 / Report categories and evidence snapshots｜存储归属 RDS｜唯一写入所有者 W-DANMAKU｜表 danmaku_report；主键 PK(id)；无唯一约束；索引 INDEX(status,createdAt)；外键 FK(danmakuId→data.danmaku.danmaku-item.id, reporterId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"danmakuId":{"type":"string","description":"外键指向 data.danmaku.danmaku-item.id（多对一，由 RDS 实施） / Foreign key to data.danmaku.danmaku-item.id (many-to-one, enforced by RDS)"},"reporterId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"category":{"type":"string","enum":["SPAM","ABUSE","SPOILER","ILLEGAL","OTHER"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"snapshotText":{"type":"string","description":"snapshotText 字段 / Field snapshotText"},"status":{"type":"string","enum":["OPEN","ACCEPTED","REJECTED"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"createdAt":{"type":"string","format":"date-time","description":"createdAt 字段 / Field createdAt"}},"required":["id","danmakuId","reporterId","category","snapshotText","status","createdAt"]}
deps:
  - kind: reference
    to: data.danmaku.danmaku-item
    label: {zh: "danmakuId→danmaku-item.id，多对一", en: "danmakuId->danmaku-item.id,"}
  - kind: reference
    to: data.identity.user
    label: {zh: "reporterId→user.id，多对一", en: "reporterId->user.id,"}
---
