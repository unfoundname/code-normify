---
uid: 3955ac8d
id: bili.pgc.course
parent: bili.pgc
state: planned
tags: [planned, "worker:W-PGC", leaf]
name: {zh: "课程与学习进度", en: "Courses and learning progress"}
description:
  zh: >
      课程、章节、课时、学习进度与直播课
  en: >
      Courses, chapters, lessons, learning progress and live classes
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/pgc/course/src/course.ts"
  - path: "services/pgc/course/src/progress.ts"
  - path: "services/pgc/course/tests/course.test.ts"
  - path: "services/pgc/course/tests/progress.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/pgc/courses/:courseId"
    description:
      zh: >
          按课程 ID 查询课程（路径参数与类型化 input 一致）
      en: >
          Get a course by path parameter and typed input
    input: {module: "bili.pgc.course", name: "CourseQueryRequest"}
    output: {module: "bili.pgc.course", name: "CourseView"}
  - protocol: http
    method: PUT
    path: "/api/v1/pgc/lesson-progress"
    description:
      zh: >
          上报课时进度
      en: >
          Report lesson progress
    input: {module: "bili.pgc.course", name: "LessonProgressRequest"}
    output: {module: "bili.pgc.course", name: "LessonProgress"}
  - protocol: http
    method: GET
    path: "/api/v1/pgc/courses/chapters"
    description:
      zh: >
          查询课程章节与课时
      en: >
          Get course chapters and lessons
    output: {module: "bili.pgc.course", name: "CourseChapterView"}
types:
  - name: "CourseView"
    description: {zh: "课程视图", en: "Course view"}
    schema: {"type":"object","description":"课程视图 / Course view","additionalProperties":false,"properties":{"courseId":{"$ref":"urn:normify:bili.contract.common:Id","description":"课程 ID / Course id"},"title":{"type":"string","minLength":1,"description":"标题 / Title"},"teacherId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 teacherId（语义见对应领域契约） / Field teacherId"},"chapterCount":{"type":"integer","description":"字段 chapterCount（语义见对应领域契约） / Field chapterCount"},"lessonCount":{"type":"integer","description":"字段 lessonCount（语义见对应领域契约） / Field lessonCount"},"price":{"$ref":"urn:normify:bili.contract.common:Money","description":"字段 price（语义见对应领域契约） / Field price"}},"required":["courseId","title","teacherId","chapterCount","lessonCount","price"]}
  - name: "LessonProgress"
    description: {zh: "课时进度", en: "Lesson progress"}
    schema: {"type":"object","description":"课时进度 / Lesson progress","additionalProperties":false,"properties":{"userId":{"$ref":"urn:normify:bili.contract.common:Id","description":"用户 ID / User id"},"courseId":{"$ref":"urn:normify:bili.contract.common:Id","description":"课程 ID / Course id"},"lessonId":{"$ref":"urn:normify:bili.contract.common:Id","description":"课时 ID / Lesson id"},"watchedSec":{"type":"integer","description":"字段 watchedSec（语义见对应领域契约） / Field watchedSec"},"finished":{"type":"boolean","description":"字段 finished（语义见对应领域契约） / Field finished"},"updatedAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"更新时间 / Updated time"}},"required":["userId","courseId","lessonId","watchedSec","finished","updatedAt"]}
  - name: "CourseChapterView"
    description: {zh: "课程章节视图", en: "Course chapter view"}
    schema: {"type":"object","description":"课程章节视图 / Course chapter view","additionalProperties":false,"properties":{"chapterId":{"$ref":"urn:normify:bili.contract.common:Id","description":"章节 ID / Chapter id"},"courseId":{"$ref":"urn:normify:bili.contract.common:Id","description":"课程 ID / Course id"},"index":{"type":"integer","description":"字段 index（语义见对应领域契约） / Field index"},"title":{"type":"string","minLength":1,"description":"标题 / Title"},"lessons":{"type":"array","items":{"$ref":"urn:normify:bili.pgc.course:LessonView"},"description":"字段 lessons（语义见对应领域契约） / Field lessons"}},"required":["chapterId","courseId","index","title","lessons"]}
  - name: "LessonView"
    description: {zh: "课时视图", en: "Lesson view"}
    schema: {"type":"object","description":"课时视图 / Lesson view","additionalProperties":false,"properties":{"lessonId":{"$ref":"urn:normify:bili.contract.common:Id","description":"课时 ID / Lesson id"},"chapterId":{"$ref":"urn:normify:bili.contract.common:Id","description":"章节 ID / Chapter id"},"index":{"type":"integer","description":"字段 index（语义见对应领域契约） / Field index"},"title":{"type":"string","minLength":1,"description":"标题 / Title"},"bvid":{"type":"string","minLength":1,"description":"视频业务号（BV 号） / Video business id"},"assetId":{"$ref":"urn:normify:bili.contract.common:Id","description":"媒体资源 ID / Media asset id"},"durationSec":{"type":"integer","description":"字段 durationSec（语义见对应领域契约） / Field durationSec"},"trialSec":{"type":"integer","description":"字段 trialSec（语义见对应领域契约） / Field trialSec"}},"required":["lessonId","chapterId","index","title","durationSec"]}
  - name: "LessonProgressRequest"
    description: {zh: "课时进度写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定）", en: "Lesson progress write request carrying only client-provided fields"}
    schema: {"type":"object","description":"课时进度写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定） / Lesson progress write request carrying only client-provided fields","additionalProperties":false,"properties":{"courseId":{"$ref":"urn:normify:bili.contract.common:Id","description":"课程 ID / Course id"},"lessonId":{"$ref":"urn:normify:bili.contract.common:Id","description":"课时 ID / Lesson id"},"watchedSec":{"type":"integer","description":"字段 watchedSec（语义见对应领域契约） / Field watchedSec"},"finished":{"type":"boolean","description":"字段 finished（语义见对应领域契约） / Field finished"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["courseId","lessonId","watchedSec","finished","idempotencyKey","requestContext"]}
  - name: "CourseQueryRequest"
    description: {zh: "课程查询请求", en: "Course query request"}
    schema: {"type":"object","description":"课程查询请求 / Course query request","additionalProperties":false,"properties":{"courseId":{"$ref":"urn:normify:bili.contract.common:Id","description":"课程 ID / Course id"}},"required":["courseId"]}
deps:
  - kind: call
    to: bili.commerce.vip
    label: {zh: "课程权益校验", en: "Course entitlement check"}
  - kind: call
    to: bili.playback.grant
    label: {zh: "课时播放授权", en: "Lesson playback grant"}
  - kind: call
    to: bili.infra.db
    label: {zh: "事务读写与表所有权校验", en: "Transactional persistence and"}
  - kind: event
    to: bili.infra.outbox
    label: {zh: "异步事件出箱与重试", en: "Async event outbox and retry"}
  - kind: reference
    to: bili.contract.common
    label: {zh: "统一 ID/时间/分页/错误契约", en: "Unified id, time, pagination"}
---
