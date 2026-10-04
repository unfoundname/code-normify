---
uid: fbfa2e38
id: bili.client.web.features.publish
parent: bili.client.web.features
state: planned
tags: ["worker:web-publish"]
name: {zh: "投稿工作台前端", en: "Publish Feature"}
description:
  zh: >
      投稿工作台：分片上传进度、断点续传、多分 P 与合集编排、封面选择、字幕上传、预约发布与提交审核。
      
  en: >
      Studio workbench: chunked upload progress, resume, episodes, collections, cover, subtitles, schedule and submit.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/web/src/features/publish/index.ts"
  - path: "apps/web/src/features/publish/pages/UploadWorkbench.tsx"
  - path: "apps/web/src/features/publish/pages/SubmissionEditPage.tsx"
  - path: "apps/web/src/features/publish/tests/publish.test.tsx"
apis: []
types:
  - name: "PublishWorkbenchState"
    description: {zh: "投稿工作台状态", en: "Publish workbench state"}
    schema: {"type":"object","additionalProperties":false,"properties":{"videoId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"submission":{"$ref":"urn:normify:bili.publish.submission:VideoSubmission"},"pipeline":{"$ref":"urn:normify:bili.media.processing:MediaPipelineState"},"upload":{"$ref":"urn:normify:bili.publish.upload:UploadResumeState"},"canSubmitReview":{"type":"boolean","description":"是否可提交审核"},"blockingReasons":{"type":"array","description":"阻塞原因","items":{"type":"string","description":"原因码"}}},"required":["videoId","canSubmitReview","blockingReasons"]}
  - name: "UploadProgressViewModel"
    description: {zh: "上传进度视图模型", en: "Upload progress view model"}
    schema: {"type":"object","additionalProperties":false,"properties":{"uploadId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"percent":{"type":"integer","description":"百分比","minimum":0,"maximum":100},"bytesPerSecond":{"type":"integer","description":"平均速率","minimum":0},"remainingSeconds":{"type":"integer","description":"预计剩余秒数","minimum":0},"paused":{"type":"boolean","description":"是否暂停"}},"required":["uploadId","percent","paused"]}
deps:
  - kind: call
    to: bili.publish.upload
    to_api: "POST /api/v1/uploads"
    label: {zh: "分片上传与续传", en: "Chunked upload and resume"}
  - kind: call
    to: bili.publish.submission
    to_api: "POST /api/v1/submissions"
    label: {zh: "草稿与提交审核", en: "Draft and submit review"}
  - kind: call
    to: bili.publish.collection
    to_api: "PUT /api/v1/submissions/{id}/episodes"
    label: {zh: "多分 P 与合集编排", en: "Episodes and collections"}
  - kind: call
    to: bili.media.artwork
    to_api: "POST /api/v1/media/subtitles"
    label: {zh: "封面与字幕登记", en: "Cover and subtitle"}
  - kind: call
    to: bili.media.processing
    to_api: "GET /api/v1/media/videos/{videoId}/pipeline"
    label: {zh: "读取处理流水线状态", en: "Read pipeline state"}
---
