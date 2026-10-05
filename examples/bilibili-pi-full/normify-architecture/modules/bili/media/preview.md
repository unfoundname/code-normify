---
uid: 7c141104
id: bili.media.preview
parent: bili.media
state: planned
tags: [planned, "worker:W-MEDIA", leaf]
name: {zh: "预览与雪碧图", en: "Previews and sprite sheets"}
description:
  zh: >
      预览短视频、雪碧图、试看片段与拖动预览
  en: >
      Preview clips, sprite sheets, trial segments and scrubbing previews
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/media/preview/src/preview.ts"
  - path: "services/media/preview/tests/preview.test.ts"
apis:
  - protocol: rpc
    path: "media.preview.build"
    description:
      zh: >
          生成预览产物
      en: >
          Build preview artifacts
    input: {module: "bili.media.storage", name: "ObjectRef"}
    output: {module: "bili.media.preview", name: "PreviewArtifact"}
types:
  - name: "PreviewArtifact"
    description: {zh: "预览产物", en: "Preview artifact"}
    schema: {"type":"object","description":"预览产物 / Preview artifact","additionalProperties":false,"properties":{"previewId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 previewId（语义见对应领域契约） / Field previewId"},"assetId":{"$ref":"urn:normify:bili.contract.common:Id","description":"媒体资源 ID / Media asset id"},"kind":{"type":"string","enum":["CLIP","SPRITE","STORYBOARD"],"description":"字段 kind（语义见对应领域契约） / Field kind"},"objectKey":{"type":"string","minLength":1,"description":"OSS 对象键 / OSS object key"},"intervalSec":{"type":"integer","description":"字段 intervalSec（语义见对应领域契约） / Field intervalSec"},"durationMs":{"type":"integer","description":"时长（毫秒） / Duration in ms"}},"required":["previewId","assetId","kind","objectKey"]}
deps:
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
