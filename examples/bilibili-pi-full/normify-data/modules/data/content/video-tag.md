---
uid: 56fb38f1
id: data.content.video-tag
parent: data.content
state: planned
tags: [planned, "worker:W-CONTENT", "storage:rds"]
name: {zh: "视频标签关系", en: "Video tag link"}
description:
  zh: >
      视频与标签的多对多关系
  en: >
      Many-to-many link between videos and tags
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/content/models/video_tag.model.sql"
apis:
  - protocol: rpc
    path: "db.table.content_video_tag"
    description:
      zh: >
          权威表 content_video_tag（唯一业务写入所有者：W-CONTENT；RDS 方言与适配器待定）
      en: >
          Authoritative table content_video_tag (sole write owner: W-CONTENT; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/content/models/video_tag.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "VideoTagRow"
    description: {zh: "视频与标签的多对多关系", en: "Many-to-many link between videos and tags"}
    schema: {"type":"object","additionalProperties":false,"description":"视频与标签的多对多关系 / Many-to-many link between videos and tags｜存储归属 RDS｜唯一写入所有者 W-CONTENT｜表 content_video_tag；主键 PK(id)；唯一约束 UNIQUE(bvid,tagId)；索引 INDEX(tagId)；外键 FK(bvid→data.content.video.id, tagId→data.content.tag.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"bvid":{"type":"string","description":"外键指向 data.content.video.id（多对一，由 RDS 实施） / Foreign key to data.content.video.id (many-to-one, enforced by RDS)"},"tagId":{"type":"string","description":"外键指向 data.content.tag.id（多对一，由 RDS 实施） / Foreign key to data.content.tag.id (many-to-one, enforced by RDS)"},"orderIndex":{"type":"integer","description":"orderIndex 字段 / Field orderIndex"}},"required":["id","bvid","tagId","orderIndex"]}
deps:
  - kind: reference
    to: data.content.video
    label: {zh: "bvid→video.id，多对一", en: "bvid->video.id, many-to-one"}
  - kind: reference
    to: data.content.tag
    label: {zh: "tagId→tag.id，多对一", en: "tagId->tag.id, many-to-one"}
---
