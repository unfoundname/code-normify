---
uid: 19fbc44f
id: data.pgc.course
parent: data.pgc
state: planned
tags: [planned, "worker:W-PGC", "storage:rds"]
name: {zh: "课程", en: "Course"}
description:
  zh: >
      课程、讲师与价格
  en: >
      Courses, teachers and prices
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/pgc/models/course.model.sql"
apis:
  - protocol: rpc
    path: "db.table.pgc_course"
    description:
      zh: >
          权威表 pgc_course（唯一业务写入所有者：W-PGC；RDS 方言与适配器待定）
      en: >
          Authoritative table pgc_course (sole write owner: W-PGC; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/pgc/models/course.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "CourseRow"
    description: {zh: "课程、讲师与价格", en: "Courses, teachers and prices"}
    schema: {"type":"object","additionalProperties":false,"description":"课程、讲师与价格 / Courses, teachers and prices｜存储归属 RDS｜唯一写入所有者 W-PGC｜表 pgc_course；主键 PK(id)；无唯一约束；索引 INDEX(teacherId)；外键 FK(teacherId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"title":{"type":"string","description":"title 字段 / Field title"},"teacherId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"chapterCount":{"type":"integer","description":"chapterCount 字段 / Field chapterCount"},"lessonCount":{"type":"integer","description":"lessonCount 字段 / Field lessonCount"},"priceAmount":{"type":"integer","description":"priceAmount 字段 / Field priceAmount"},"currency":{"type":"string","enum":["CNY","BCOIN","BATTERY","COIN"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"}},"required":["id","title","teacherId","chapterCount","lessonCount","priceAmount","currency"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "teacherId→user.id，多对一", en: "teacherId->user.id,"}
---
