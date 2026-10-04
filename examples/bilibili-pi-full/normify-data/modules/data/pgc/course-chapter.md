---
uid: 2f5b43e7
id: data.pgc.course-chapter
parent: data.pgc
state: planned
tags: [planned, "worker:W-PGC", "storage:rds"]
name: {zh: "课程章节", en: "Course chapter"}
description:
  zh: >
      章节顺序
  en: >
      Chapter ordering
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/pgc/models/course_chapter.model.sql"
apis:
  - protocol: rpc
    path: "db.table.pgc_course_chapter"
    description:
      zh: >
          权威表 pgc_course_chapter（唯一业务写入所有者：W-PGC；RDS 方言与适配器待定）
      en: >
          Authoritative table pgc_course_chapter (sole write owner: W-PGC; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/pgc/models/course_chapter.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "CourseChapterRow"
    description: {zh: "章节顺序", en: "Chapter ordering"}
    schema: {"type":"object","additionalProperties":false,"description":"章节顺序 / Chapter ordering｜存储归属 RDS｜唯一写入所有者 W-PGC｜表 pgc_course_chapter；主键 PK(id)；唯一约束 UNIQUE(courseId,index)；无二级索引；外键 FK(courseId→data.pgc.course.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"courseId":{"type":"string","description":"外键指向 data.pgc.course.id（多对一，由 RDS 实施） / Foreign key to data.pgc.course.id (many-to-one, enforced by RDS)"},"index":{"type":"integer","description":"index 字段 / Field index"},"title":{"type":"string","description":"title 字段 / Field title"}},"required":["id","courseId","index","title"]}
deps:
  - kind: reference
    to: data.pgc.course
    label: {zh: "courseId→course.id，多对一", en: "courseId->course.id,"}
---
