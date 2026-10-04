---
uid: 39156d28
id: data.pgc.lesson-progress
parent: data.pgc
state: planned
tags: [planned, "worker:W-PGC", "storage:rds"]
name: {zh: "课时进度", en: "Lesson progress"}
description:
  zh: >
      学习进度与完成标记
  en: >
      Learning progress and completion
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/pgc/models/lesson_progress.model.sql"
apis:
  - protocol: rpc
    path: "db.table.pgc_lesson_progress"
    description:
      zh: >
          权威表 pgc_lesson_progress（唯一业务写入所有者：W-PGC；RDS 方言与适配器待定）
      en: >
          Authoritative table pgc_lesson_progress (sole write owner: W-PGC; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/pgc/models/lesson_progress.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "LessonProgressRow"
    description: {zh: "学习进度与完成标记", en: "Learning progress and completion"}
    schema: {"type":"object","additionalProperties":false,"description":"学习进度与完成标记 / Learning progress and completion｜存储归属 RDS｜唯一写入所有者 W-PGC｜表 pgc_lesson_progress；主键 PK(id)；唯一约束 UNIQUE(userId,lessonId)；无二级索引；外键 FK(userId→data.identity.user.id, courseId→data.pgc.course.id, lessonId→data.pgc.lesson.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"userId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"courseId":{"type":"string","description":"外键指向 data.pgc.course.id（多对一，由 RDS 实施） / Foreign key to data.pgc.course.id (many-to-one, enforced by RDS)"},"lessonId":{"type":"string","description":"外键指向 data.pgc.lesson.id（多对一，由 RDS 实施） / Foreign key to data.pgc.lesson.id (many-to-one, enforced by RDS)"},"watchedSec":{"type":"integer","description":"watchedSec 字段 / Field watchedSec"},"finished":{"type":"boolean","description":"finished 字段 / Field finished"},"updatedAt":{"type":"string","format":"date-time","description":"updatedAt 字段 / Field updatedAt"}},"required":["id","userId","courseId","lessonId","watchedSec","finished","updatedAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "userId→user.id，多对一", en: "userId->user.id, many-to-one"}
  - kind: reference
    to: data.pgc.course
    label: {zh: "courseId→course.id，多对一", en: "courseId->course.id,"}
  - kind: reference
    to: data.pgc.lesson
    label: {zh: "lessonId→lesson.id，多对一", en: "lessonId->lesson.id,"}
---
