---
uid: "65065e54"
id: bili.publish.submission
parent: bili.publish
state: planned
tags: ["worker:pub-submission"]
name: {zh: "稿件与草稿", en: "Submissions and Drafts"}
description:
  zh: >
      稿件元数据与草稿生命周期：分区、标签、联合投稿、编辑、提交审核、下架；只写自己的表。
      
  en: >
      Submission metadata and draft lifecycle: partition, tags, co-authors, edit, submit, takedown.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/publish/submission/src/service.ts"
  - path: "services/publish/submission/migrations/0001_submission.sql"
  - path: "services/publish/submission/tests/submission.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/submissions"
    description:
      zh: >
          创建草稿
          
      en: >
          Create draft
          
    input: {module: "bili.publish.submission", name: "SubmissionDraftRequest"}
    output: {module: "bili.publish.submission", name: "VideoSubmission"}
  - protocol: http
    method: PATCH
    path: "/api/v1/submissions/{id}"
    description:
      zh: >
          编辑稿件元数据
          
      en: >
          Update submission metadata
          
    input: {module: "bili.publish.submission", name: "SubmissionDraftRequest"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: GET
    path: "/api/v1/submissions/{id}"
    description:
      zh: >
          读取稿件
          
      en: >
          Get submission
          
    output: {module: "bili.publish.submission", name: "VideoSubmission"}
  - protocol: http
    method: GET
    path: "/api/v1/submissions"
    description:
      zh: >
          列出我的稿件
          
      en: >
          List own submissions
          
    input: {module: "bili.contract.core.paging", name: "PageRequest"}
    output: {module: "bili.publish.submission", name: "SubmissionPage"}
  - protocol: http
    method: POST
    path: "/api/v1/submissions/{id}/submit-review"
    description:
      zh: >
          提交审核（不改发布状态）
          
      en: >
          Submit for review
          
    input: {module: "bili.contract.core.idempotency", name: "IdempotencyKey"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: POST
    path: "/api/v1/submissions/{id}/takedown"
    description:
      zh: >
          UP 主主动下架
          
      en: >
          Request takedown
          
    input: {module: "bili.contract.core.idempotency", name: "IdempotencyKey"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: mysql
    path: "video_submission"
    description:
      zh: >
          稿件表（唯一写入所有者：投稿服务）
          
      en: >
          video_submission table
          
types:
  - name: "VideoSubmission"
    description: {zh: "稿件（草稿/待审）", en: "Video submission"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 video_submission，唯一写入所有者 bili.publish.submission","properties":{"videoId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"ownerId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"title":{"type":"string","description":"标题","minLength":1,"maxLength":80},"description":{"type":"string","description":"简介","maxLength":2000},"partitionId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"tags":{"type":"array","description":"标签（≤10 个）","items":{"type":"string","description":"标签","maxLength":20},"maxItems":10},"visibility":{"$ref":"urn:normify:bili.contract.core.ids:Visibility"},"coAuthorIds":{"type":"array","description":"联合投稿者","items":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"maxItems":5},"coverAssetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"state":{"type":"string","enum":["draft","media_processing","ready_for_review","in_review","rejected","approved","published","taken_down","deleted"],"description":"稿件状态机（与媒体/审核状态机分离）"},"version":{"type":"integer","description":"版本号（乐观锁）","minimum":1},"createdAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"updatedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["videoId","ownerId","title","partitionId","state","version"]}
  - name: "SubmissionDraftRequest"
    description: {zh: "草稿创建/更新请求", en: "Draft create or update request"}
    schema: {"type":"object","additionalProperties":false,"properties":{"title":{"type":"string","description":"标题","minLength":1,"maxLength":80},"description":{"type":"string","description":"简介","maxLength":2000},"partitionId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"tags":{"type":"array","description":"标签","items":{"type":"string","description":"标签","maxLength":20},"maxItems":10},"visibility":{"$ref":"urn:normify:bili.contract.core.ids:Visibility"},"coAuthorIds":{"type":"array","description":"联合投稿者","items":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"maxItems":5},"coverAssetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.core.idempotency:IdempotencyKey"}},"required":["title","partitionId","idempotencyKey"]}
  - name: "SubmissionPage"
    description: {zh: "稿件分页", en: "Submission page"}
    schema: {"type":"object","additionalProperties":false,"properties":{"items":{"type":"array","description":"稿件条目","items":{"$ref":"urn:normify:bili.publish.submission:VideoSubmission"}},"page":{"$ref":"urn:normify:bili.contract.core.paging:PageMeta"}},"required":["items","page"]}
  - name: "SubmissionEventPayload"
    description: {zh: "稿件事件载荷", en: "Submission event payload"}
    schema: {"type":"object","additionalProperties":false,"description":"publish.submission.state_changed 事件载荷；审核与通知模块按事件消费","properties":{"videoId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"ownerId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"fromState":{"type":"string","description":"原状态"},"toState":{"type":"string","description":"新状态"},"reason":{"type":"string","description":"原因（驳回/下架必填）"},"occurredAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["videoId","fromState","toState","occurredAt"]}
deps:
  - kind: call
    to: bili.media.asset
    from_api: "POST /api/v1/submissions/{id}/submit-review"
    to_api: "POST /api/v1/media/assets"
    label: {zh: "校验媒体原件已登记", en: "Verify media assets exist"}
  - kind: call
    to: bili.publish.catalog
    from_api: "POST /api/v1/submissions/{id}/takedown"
    to_api: "POST /api/v1/catalog/videos/{videoId}/commands"
    label: {zh: "发布/下架只能经目录命令", en: "Publish only through catalog"}
  - kind: event
    to: bili.contract.core.events
    from_api: "POST /api/v1/submissions/{id}/submit-review"
    label: {zh: "状态变更事件用于审核与通知", en: "State change events"}
  - kind: call
    to: bili.infra.jobs
    from_api: "POST /api/v1/submissions/{id}/submit-review"
    label: {zh: "审核任务入队（outbox ", en: "Enqueue review job"}
  - kind: event
    to: bili.ops.review
    from_api: "POST /api/v1/submissions/{id}/submit-review"
    to_api: "POST /internal/review/tasks"
    label: {zh: "提交审核事件入队", en: "Submit event to review queue"}
---
