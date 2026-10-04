---
uid: ddba7148
id: data.danmaku.danmaku-item
parent: data.danmaku
state: planned
tags: [planned, "worker:W-DANMAKU", "storage:rds"]
name: {zh: "弹幕条目", en: "Danmaku item"}
description:
  zh: >
      单条弹幕的内容、样式与位置
  en: >
      Single danmaku content, style and position
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/community/models/danmaku_item.model.sql"
apis:
  - protocol: rpc
    path: "db.table.danmaku_item"
    description:
      zh: >
          权威表 danmaku_item（唯一业务写入所有者：W-DANMAKU；RDS 方言与适配器待定）
      en: >
          Authoritative table danmaku_item (sole write owner: W-DANMAKU; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/community/models/danmaku_item.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "DanmakuItemRow"
    description: {zh: "单条弹幕的内容、样式与位置", en: "Single danmaku content, style and position"}
    schema: {"type":"object","additionalProperties":false,"description":"单条弹幕的内容、样式与位置 / Single danmaku content, style and position｜存储归属 RDS｜唯一写入所有者 W-DANMAKU｜表 danmaku_item；主键 PK(id)；无唯一约束；索引 INDEX(segmentId,positionMs), INDEX(senderId)；外键 FK(segmentId→data.danmaku.danmaku-segment.id, senderId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"segmentId":{"type":"string","description":"外键指向 data.danmaku.danmaku-segment.id（多对一，由 RDS 实施） / Foreign key to data.danmaku.danmaku-segment.id (many-to-one, enforced by RDS)"},"senderId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"positionMs":{"type":"integer","description":"positionMs 字段 / Field positionMs"},"text":{"type":"string","description":"text 字段 / Field text"},"mode":{"type":"string","enum":["SCROLL","TOP","BOTTOM","REVERSE"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"color":{"type":"integer","description":"color 字段 / Field color"},"fontSize":{"type":"integer","description":"fontSize 字段 / Field fontSize"},"auditState":{"type":"string","enum":["PENDING","PASSED","REJECTED","ESCALATED","APPEALING"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"createdAt":{"type":"string","format":"date-time","description":"createdAt 字段 / Field createdAt"}},"required":["id","segmentId","senderId","positionMs","text","mode","color","fontSize","auditState","createdAt"]}
deps:
  - kind: reference
    to: data.danmaku.danmaku-segment
    label: {zh: "segmentId→danmaku-segment.id，多", en: "segmentId->danmaku-segment.id,"}
  - kind: reference
    to: data.identity.user
    label: {zh: "senderId→user.id，多对一", en: "senderId->user.id, many-to-one"}
---
