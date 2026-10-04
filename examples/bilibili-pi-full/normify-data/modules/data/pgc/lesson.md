---
uid: 9c52ac36
id: data.pgc.lesson
parent: data.pgc
state: planned
tags: [planned, "worker:W-PGC", "storage:rds"]
name: {zh: "课时", en: "Lesson"}
description:
  zh: >
      课时与视频映射
  en: >
      Lessons and video mapping
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/pgc/models/lesson.model.sql"
apis:
  - protocol: rpc
    path: "db.table.pgc_lesson"
    description:
      zh: >
          权威表 pgc_lesson（唯一业务写入所有者：W-PGC；RDS 方言与适配器待定）
      en: >
          Authoritative table pgc_lesson (sole write owner: W-PGC; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/pgc/models/lesson.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "LessonRow"
    description: {zh: "课时与视频映射", en: "Lessons and video mapping"}
    schema: {"type":"object","additionalProperties":false,"description":"课时与视频映射 / Lessons and video mapping｜存储归属 RDS｜唯一写入所有者 W-PGC｜表 pgc_lesson；主键 PK(id)；唯一约束 UNIQUE(chapterId,index)；无二级索引；外键 FK(chapterId→data.pgc.course-chapter.id, bvid→data.content.video.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"chapterId":{"type":"string","description":"外键指向 data.pgc.course-chapter.id（多对一，由 RDS 实施） / Foreign key to data.pgc.course-chapter.id (many-to-one, enforced by RDS)"},"index":{"type":"integer","description":"index 字段 / Field index"},"title":{"type":"string","description":"title 字段 / Field title"},"bvid":{"type":"string","description":"外键指向 data.content.video.id（多对一，由 RDS 实施） / Foreign key to data.content.video.id (many-to-one, enforced by RDS)"},"durationSec":{"type":"integer","description":"durationSec 字段 / Field durationSec"}},"required":["id","chapterId","index","title","durationSec"]}
deps:
  - kind: reference
    to: data.pgc.course-chapter
    label: {zh: "chapterId→course-chapter.id，多对", en: "chapterId->course-chapter.id,"}
  - kind: reference
    to: data.content.video
    label: {zh: "bvid→video.id，多对一", en: "bvid->video.id, many-to-one"}
---
