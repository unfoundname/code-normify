---
uid: fff59199
id: bili.premium.classroom
parent: bili.premium
state: planned
tags: ["worker:pm-classroom"]
name: {zh: "课程与学习进度", en: "Courses and Learning Progress"}
description:
  zh: >
      课程与课时、试听、报名与有效期、学习进度与完课判定、随堂测验与证书。
      
  en: >
      Courses and lessons, previews, enrollment and validity, learning progress, quizzes and certificates.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/premium/classroom/src/course.ts"
  - path: "services/premium/classroom/src/progress.ts"
  - path: "services/premium/classroom/migrations/0001_course.sql"
  - path: "services/premium/classroom/tests/course.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/courses/{id}"
    description:
      zh: >
          读取课程与课时
          
      en: >
          Get course
          
    output: {module: "bili.premium.classroom", name: "CourseRecord"}
  - protocol: http
    method: POST
    path: "/api/v1/courses/{id}/enroll"
    description:
      zh: >
          报名课程（生成订单）
          
      en: >
          Enroll course
          
    input: {module: "bili.commerce.order", name: "OrderRecord"}
    output: {module: "bili.premium.classroom", name: "CourseEnrollment"}
  - protocol: http
    method: POST
    path: "/api/v1/courses/{id}/progress"
    description:
      zh: >
          上报学习进度
          
      en: >
          Report learning progress
          
    input: {module: "bili.premium.classroom", name: "LearningProgress"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: GET
    path: "/api/v1/courses/me"
    description:
      zh: >
          我的课程
          
      en: >
          My courses
          
    output: {module: "bili.premium.classroom", name: "CourseEnrollment"}
  - protocol: mysql
    path: "course_enrollment"
    description:
      zh: >
          课程报名表（唯一写入所有者：课堂服务）
          
      en: >
          course_enrollment table
          
types:
  - name: "CourseRecord"
    description: {zh: "课程", en: "Course"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 course","properties":{"courseId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"teacherId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"title":{"type":"string","description":"课程标题","maxLength":120},"description":{"type":"string","description":"简介","maxLength":2000},"coverAssetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"price":{"$ref":"urn:normify:bili.contract.core.ids:MoneyAmount"},"state":{"type":"string","enum":["draft","pending_review","on_sale","off_shelf","finished"],"description":"状态机"},"totalLessons":{"type":"integer","description":"课时数","minimum":0},"studentCount":{"type":"integer","description":"报名人数（投影）","minimum":0},"tags":{"type":"array","description":"标签","items":{"type":"string","description":"标签"}},"validityDays":{"type":"integer","description":"有效期天","minimum":0}},"required":["courseId","teacherId","title","price","state"]}
  - name: "LessonRecord"
    description: {zh: "课时", en: "Lesson"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 course_lesson，唯一约束 course_id+lesson_index","properties":{"lessonId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"courseId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"lessonIndex":{"type":"integer","description":"序号","minimum":1},"title":{"type":"string","description":"课时标题","maxLength":120},"durationMs":{"type":"integer","description":"时长毫秒","minimum":0},"assetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"previewEnabled":{"type":"boolean","description":"是否可试听"},"quizJson":{"type":"string","description":"随堂测验定义 JSON"},"state":{"type":"string","enum":["draft","published","offline"],"description":"状态"}},"required":["lessonId","courseId","lessonIndex","title","state"]}
  - name: "CourseEnrollment"
    description: {zh: "课程报名", en: "Course enrollment"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 course_enrollment，唯一约束 user_id+course_id","properties":{"enrollmentId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"userId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"courseId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"orderId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"state":{"type":"string","enum":["active","expired","refunded","completed"],"description":"状态机"},"enrolledAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"expiresAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["enrollmentId","userId","courseId","state","enrolledAt"]}
  - name: "LearningProgress"
    description: {zh: "学习进度", en: "Learning progress"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 learning_progress，唯一约束 user_id+lesson_id","properties":{"userId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"courseId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"lessonId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"watchedMs":{"type":"integer","description":"已观看毫秒","minimum":0},"lastPositionMs":{"type":"integer","description":"最后位置毫秒","minimum":0},"completed":{"type":"boolean","description":"是否完课"},"quizScore":{"type":"integer","description":"测验得分","minimum":0,"maximum":100},"updatedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["userId","courseId","lessonId","watchedMs","updatedAt"]}
deps:
  - kind: call
    to: bili.commerce.order
    from_api: "POST /api/v1/courses/{id}/enroll"
    to_api: "POST /api/v1/orders"
    label: {zh: "报名走订单支付", en: "Enroll via order"}
  - kind: call
    to: bili.contract.media.playback
    label: {zh: "课程播放走统一授权", en: "Playback via grant"}
  - kind: call
    to: bili.media.asset
    label: {zh: "课时资产引用媒体原件", en: "Lessons reference assets"}
  - kind: event
    to: bili.contract.core.events
    label: {zh: "完课事件驱动证书与推荐", en: "Completion events"}
---
