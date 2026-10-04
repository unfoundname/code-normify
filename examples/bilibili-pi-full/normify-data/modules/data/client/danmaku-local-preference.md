---
uid: 4a4a35c0
id: data.client.danmaku-local-preference
parent: data.client
state: planned
tags: [planned, "worker:W-WEB-CORE", "storage:rds"]
name: {zh: "弹幕本地偏好备份", en: "Danmaku local preference backup"}
description:
  zh: >
      客户端弹幕偏好的服务端备份
  en: >
      Server-side backup of client danmaku preferences
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/ops/models/danmaku_local_preference.model.sql"
apis:
  - protocol: rpc
    path: "db.table.client_danmaku_local_preference"
    description:
      zh: >
          权威表 client_danmaku_local_preference（唯一业务写入所有者：W-WEB-CORE；RDS 方言与适配器待定）
      en: >
          Authoritative table client_danmaku_local_preference (sole write owner: W-WEB-CORE; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/ops/models/danmaku_local_preference.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "DanmakuLocalPreferenceRow"
    description: {zh: "客户端弹幕偏好的服务端备份", en: "Server-side backup of client danmaku preferences"}
    schema: {"type":"object","additionalProperties":false,"description":"客户端弹幕偏好的服务端备份 / Server-side backup of client danmaku preferences｜存储归属 RDS｜唯一写入所有者 W-WEB-CORE｜表 client_danmaku_local_preference；主键 PK(id)；唯一约束 UNIQUE(userId)；无二级索引；外键 FK(userId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"userId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"opacity":{"type":"number","description":"opacity 字段 / Field opacity"},"displayAreaPercent":{"type":"integer","description":"displayAreaPercent 字段 / Field displayAreaPercent"},"fontScale":{"type":"number","description":"fontScale 字段 / Field fontScale"},"updatedAt":{"type":"string","format":"date-time","description":"updatedAt 字段 / Field updatedAt"}},"required":["id","userId","opacity","displayAreaPercent","fontScale","updatedAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "userId→user.id，多对一", en: "userId->user.id, many-to-one"}
---
