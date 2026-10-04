---
uid: 33c16a95
id: bili.creator.works
parent: bili.creator
state: planned
tags: ["worker:cre-works"]
name: {zh: "投稿管理", en: "Work Management"}
description:
  zh: >
      创作者的稿件列表与筛选、三状态机（处理/审核/发布）联视图、批量操作、驳回原因与重投指引。
      
  en: >
      Creator work list and filters, unified view of the three state machines, batch actions, reject reasons.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/creator/works/src/query.ts"
  - path: "services/creator/works/src/actions.ts"
  - path: "services/creator/works/tests/works.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/creator/works"
    description:
      zh: >
          列出我的稿件（三状态机联视图）
          
      en: >
          List creator works
          
    input: {module: "bili.creator.works", name: "CreatorWorkQuery"}
    output: {module: "bili.creator.works", name: "CreatorWorkItem"}
  - protocol: http
    method: GET
    path: "/api/v1/creator/works/{id}"
    description:
      zh: >
          读取稿件详情与阻塞原因
          
      en: >
          Get work detail
          
    output: {module: "bili.creator.works", name: "CreatorWorkItem"}
  - protocol: http
    method: POST
    path: "/api/v1/creator/works/batch-actions"
    description:
      zh: >
          批量操作稿件
          
      en: >
          Batch work actions
          
    input: {module: "bili.creator.works", name: "WorkBatchActionRequest"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
types:
  - name: "CreatorWorkItem"
    description: {zh: "创作者稿件条目", en: "Creator work item"}
    schema: {"type":"object","additionalProperties":false,"description":"只读联视图：三个状态机各自权威，本视图不写任何表","properties":{"videoId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"title":{"type":"string","description":"标题"},"coverAssetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"partitionId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"durationMs":{"type":"integer","description":"时长毫秒","minimum":0},"visibility":{"$ref":"urn:normify:bili.contract.core.ids:Visibility"},"mediaState":{"$ref":"urn:normify:bili.media.processing:MediaPipelineState"},"submissionState":{"type":"string","enum":["draft","media_processing","ready_for_review","in_review","rejected","approved","published","taken_down","deleted"],"description":"稿件状态"},"reviewState":{"type":"string","enum":["not_submitted","pending","machine_passed","human_review","approved","rejected"],"description":"审核状态"},"publishState":{"type":"string","enum":["unpublished","published","scheduled","taken_down","copyright_blocked"],"description":"发布状态"},"rejectReason":{"type":"string","description":"驳回原因"},"submittedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"publishedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"playCount":{"type":"integer","description":"播放量（投影）","minimum":0}},"required":["videoId","title","mediaState","submissionState","reviewState","publishState"]}
  - name: "CreatorWorkQuery"
    description: {zh: "稿件筛选条件", en: "Creator work query"}
    schema: {"type":"object","additionalProperties":false,"description":"查询一律带 owner 约束，禁止越权","properties":{"states":{"type":"array","description":"稿件状态","items":{"type":"string","description":"状态"}},"partitionId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"keyword":{"type":"string","description":"标题关键词"},"dateFrom":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"dateTo":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"sort":{"type":"string","enum":["newest","plays","danmaku","comments"],"description":"排序"},"cursor":{"type":"string","description":"游标"},"pageSize":{"type":"integer","description":"每页条数","minimum":1,"maximum":50}},"required":["pageSize"]}
  - name: "WorkBatchActionRequest"
    description: {zh: "稿件批量操作", en: "Work batch action"}
    schema: {"type":"object","additionalProperties":false,"description":"批量下架/改可见性必须逐条经领域命令，不直改表","properties":{"videoIds":{"type":"array","description":"稿件 id","items":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"minItems":1,"maxItems":50},"action":{"type":"string","enum":["takedown","delete_draft","change_visibility","change_partition"],"description":"动作"},"visibility":{"$ref":"urn:normify:bili.contract.core.ids:Visibility"},"partitionId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"reason":{"type":"string","description":"原因"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.core.idempotency:IdempotencyKey"}},"required":["videoIds","action","idempotencyKey"]}
deps:
  - kind: call
    to: bili.publish.submission
    label: {zh: "读取稿件元数据与状态", en: "Read submission state"}
  - kind: call
    to: bili.publish.catalog
    label: {zh: "读取发布状态", en: "Read publish state"}
  - kind: call
    to: bili.media.processing
    from_api: "GET /api/v1/creator/works/{id}"
    to_api: "GET /api/v1/media/videos/{videoId}/pipeline"
    label: {zh: "读取媒体处理流水线", en: "Read media pipeline"}
  - kind: call
    to: bili.publish.submission
    from_api: "POST /api/v1/creator/works/batch-actions"
    to_api: "PATCH /api/v1/submissions/{id}"
    label: {zh: "批量动作转领域命令", en: "Batch actions via domain comma"}
---
