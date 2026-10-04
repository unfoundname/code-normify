---
uid: 44a8a859
id: data.message.system-notice
parent: data.message
state: planned
tags: [planned, "worker:W-MESSAGE", "storage:rds"]
name: {zh: "系统提醒", en: "System notice"}
description:
  zh: >
      公告受众、生效窗口与状态
  en: >
      Announcement audience, effective window and status
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/message/models/system_notice.model.sql"
apis:
  - protocol: rpc
    path: "db.table.message_system_notice"
    description:
      zh: >
          权威表 message_system_notice（唯一业务写入所有者：W-MESSAGE；RDS 方言与适配器待定）
      en: >
          Authoritative table message_system_notice (sole write owner: W-MESSAGE; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/message/models/system_notice.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "SystemNoticeRow"
    description: {zh: "公告受众、生效窗口与状态", en: "Announcement audience, effective window and status"}
    schema: {"type":"object","additionalProperties":false,"description":"公告受众、生效窗口与状态 / Announcement audience, effective window and status｜存储归属 RDS｜唯一写入所有者 W-MESSAGE｜表 message_system_notice；主键 PK(id)；无唯一约束；索引 INDEX(publishAt,status)；无外键｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"title":{"type":"string","description":"title 字段 / Field title"},"content":{"type":"string","description":"content 字段 / Field content"},"audience":{"type":"string","description":"audience 字段 / Field audience"},"publishAt":{"type":"string","format":"date-time","description":"publishAt 字段 / Field publishAt"},"expireAt":{"type":"string","format":"date-time","description":"expireAt 字段 / Field expireAt"},"status":{"type":"string","enum":["DRAFT","PUBLISHED","EXPIRED","REVOKED"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"}},"required":["id","title","content","audience","publishAt","status"]}
---
