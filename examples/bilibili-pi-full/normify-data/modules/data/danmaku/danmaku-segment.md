---
uid: 9d606ffe
id: data.danmaku.danmaku-segment
parent: data.danmaku
state: planned
tags: [planned, "worker:W-DANMAKU", "storage:rds"]
name: {zh: "弹幕分片", en: "Danmaku segment"}
description:
  zh: >
      按时间段的弹幕分片与版本
  en: >
      Danmaku segments with version per time window
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/community/models/danmaku_segment.model.sql"
apis:
  - protocol: rpc
    path: "db.table.danmaku_segment"
    description:
      zh: >
          权威表 danmaku_segment（唯一业务写入所有者：W-DANMAKU；RDS 方言与适配器待定）
      en: >
          Authoritative table danmaku_segment (sole write owner: W-DANMAKU; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/community/models/danmaku_segment.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "DanmakuSegmentRow"
    description: {zh: "按时间段的弹幕分片与版本", en: "Danmaku segments with version per time window"}
    schema: {"type":"object","additionalProperties":false,"description":"按时间段的弹幕分片与版本 / Danmaku segments with version per time window｜存储归属 RDS｜唯一写入所有者 W-DANMAKU｜表 danmaku_segment；主键 PK(id)；唯一约束 UNIQUE(bvid,startMs,endMs)；无二级索引；外键 FK(bvid→data.content.video.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"bvid":{"type":"string","description":"外键指向 data.content.video.id（多对一，由 RDS 实施） / Foreign key to data.content.video.id (many-to-one, enforced by RDS)"},"startMs":{"type":"integer","description":"startMs 字段 / Field startMs"},"endMs":{"type":"integer","description":"endMs 字段 / Field endMs"},"version":{"type":"integer","description":"version 字段 / Field version"},"itemCount":{"type":"integer","description":"itemCount 字段 / Field itemCount"},"updatedAt":{"type":"string","format":"date-time","description":"updatedAt 字段 / Field updatedAt"}},"required":["id","bvid","startMs","endMs","version","itemCount","updatedAt"]}
deps:
  - kind: reference
    to: data.content.video
    label: {zh: "bvid→video.id，多对一", en: "bvid->video.id, many-to-one"}
---
