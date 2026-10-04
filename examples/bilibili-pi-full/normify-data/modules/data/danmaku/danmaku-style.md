---
uid: c4e5a0aa
id: data.danmaku.danmaku-style
parent: data.danmaku
state: planned
tags: [planned, "worker:W-DANMAKU", "storage:rds"]
name: {zh: "弹幕样式", en: "Danmaku style"}
description:
  zh: >
      稿件或平台的弹幕渲染参数
  en: >
      Per-video or platform danmaku render parameters
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/community/models/danmaku_style.model.sql"
apis:
  - protocol: rpc
    path: "db.table.danmaku_style"
    description:
      zh: >
          权威表 danmaku_style（唯一业务写入所有者：W-DANMAKU；RDS 方言与适配器待定）
      en: >
          Authoritative table danmaku_style (sole write owner: W-DANMAKU; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/community/models/danmaku_style.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "DanmakuStyleRow"
    description: {zh: "稿件或平台的弹幕渲染参数", en: "Per-video or platform danmaku render parameters"}
    schema: {"type":"object","additionalProperties":false,"description":"稿件或平台的弹幕渲染参数 / Per-video or platform danmaku render parameters｜存储归属 RDS｜唯一写入所有者 W-DANMAKU｜表 danmaku_style；主键 PK(id)；唯一约束 UNIQUE(scope)；无二级索引；外键 FK(targetId→data.content.video.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"scope":{"type":"string","enum":["SCRIPT","PLATFORM"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"fontSize":{"type":"integer","description":"fontSize 字段 / Field fontSize"},"alpha":{"type":"number","description":"alpha 字段 / Field alpha"},"displayAreaPercent":{"type":"integer","description":"displayAreaPercent 字段 / Field displayAreaPercent"},"scrollSpeed":{"type":"number","description":"scrollSpeed 字段 / Field scrollSpeed"},"updatedAt":{"type":"string","format":"date-time","description":"updatedAt 字段 / Field updatedAt"},"targetId":{"type":"string","description":"外键指向 data.content.video.id（多对一，由 RDS 实施） / Foreign key to data.content.video.id (many-to-one, enforced by RDS)"}},"required":["id","scope","fontSize","alpha","displayAreaPercent","scrollSpeed","updatedAt","targetId"]}
deps:
  - kind: reference
    to: data.content.video
    label: {zh: "targetId→video.id，多对一", en: "targetId->video.id,"}
---
