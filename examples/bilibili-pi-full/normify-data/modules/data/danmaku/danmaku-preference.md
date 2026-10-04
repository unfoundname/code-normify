---
uid: cb9c2332
id: data.danmaku.danmaku-preference
parent: data.danmaku
state: planned
tags: [planned, "worker:W-DANMAKU", "storage:rds"]
name: {zh: "弹幕偏好", en: "Danmaku preference"}
description:
  zh: >
      屏蔽词、正则与类型屏蔽
  en: >
      Blocked keywords, regex and type filters
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/community/models/danmaku_preference.model.sql"
apis:
  - protocol: rpc
    path: "db.table.danmaku_preference"
    description:
      zh: >
          权威表 danmaku_preference（唯一业务写入所有者：W-DANMAKU；RDS 方言与适配器待定）
      en: >
          Authoritative table danmaku_preference (sole write owner: W-DANMAKU; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/community/models/danmaku_preference.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "DanmakuPreferenceRow"
    description: {zh: "屏蔽词、正则与类型屏蔽", en: "Blocked keywords, regex and type filters"}
    schema: {"type":"object","additionalProperties":false,"description":"屏蔽词、正则与类型屏蔽 / Blocked keywords, regex and type filters｜存储归属 RDS｜唯一写入所有者 W-DANMAKU｜表 danmaku_preference；主键 PK(id)；唯一约束 UNIQUE(userId)；无二级索引；外键 FK(userId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"userId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"blockedKeywords":{"type":"array","items":{"type":"string"},"description":"blockedKeywords 字段 / Field blockedKeywords"},"blockedRegex":{"type":"array","items":{"type":"string"},"description":"blockedRegex 字段 / Field blockedRegex"},"blockedTypesJson":{"type":"object","additionalProperties":true,"description":"blockedTypesJson 字段 / Field blockedTypesJson"},"updatedAt":{"type":"string","format":"date-time","description":"updatedAt 字段 / Field updatedAt"}},"required":["id","userId","blockedKeywords","blockedRegex","blockedTypesJson","updatedAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "userId→user.id，多对一", en: "userId->user.id, many-to-one"}
---
