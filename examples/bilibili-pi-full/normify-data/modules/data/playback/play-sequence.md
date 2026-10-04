---
uid: 15e687a1
id: data.playback.play-sequence
parent: data.playback
state: planned
tags: [planned, "worker:W-PLAYBACK", "storage:rds"]
name: {zh: "播放序列", en: "Play sequence"}
description:
  zh: >
      连播序列与当前位次
  en: >
      Play sequences and current position
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/media/models/play_sequence.model.sql"
apis:
  - protocol: rpc
    path: "db.table.playback_sequence"
    description:
      zh: >
          权威表 playback_sequence（唯一业务写入所有者：W-PLAYBACK；RDS 方言与适配器待定）
      en: >
          Authoritative table playback_sequence (sole write owner: W-PLAYBACK; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/media/models/play_sequence.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "PlaySequenceRow"
    description: {zh: "连播序列与当前位次", en: "Play sequences and current position"}
    schema: {"type":"object","additionalProperties":false,"description":"连播序列与当前位次 / Play sequences and current position｜存储归属 RDS｜唯一写入所有者 W-PLAYBACK｜表 playback_sequence；主键 PK(id)；无唯一约束；索引 INDEX(userId,updatedAt)；外键 FK(userId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"userId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"rootResourceId":{"type":"string","description":"rootResourceId 字段 / Field rootResourceId"},"kind":{"type":"string","enum":["COLLECTION","SEASON","COURSE"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"resourceIds":{"type":"array","items":{"type":"string"},"description":"resourceIds 字段 / Field resourceIds"},"currentIndex":{"type":"integer","description":"currentIndex 字段 / Field currentIndex"},"updatedAt":{"type":"string","format":"date-time","description":"updatedAt 字段 / Field updatedAt"}},"required":["id","rootResourceId","kind","resourceIds","currentIndex","updatedAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "userId→user.id，多对一", en: "userId->user.id, many-to-one"}
---
