---
uid: 5b0f7f6a
id: bili.client.shared.uploader
parent: bili.client.shared
state: planned
tags: [planned, "worker:W-CONTRACT", leaf]
name: {zh: "上传器组件契约", en: "Uploader component contract"}
description:
  zh: >
      分片上传、断点续传、进度与失败重试的前端契约
  en: >
      Front-end contract for chunked upload, resume, progress and retry
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/web/src/shared/uploader/index.tsx"
  - path: "apps/web/src/shared/uploader/chunk-manager.ts"
  - path: "apps/web/tests/shared/uploader/index.test.tsx"
  - path: "apps/web/tests/shared/uploader/chunk-manager.test.ts"
apis:
  - protocol: file
    path: "apps/web/src/shared/uploader/index.tsx"
    description:
      zh: >
          上传器组件入口
      en: >
          Uploader component entry
types:
  - name: "UploaderProps"
    description: {zh: "上传器属性", en: "Uploader props"}
    schema: {"type":"object","description":"上传器属性 / Uploader props","additionalProperties":false,"properties":{"accept":{"type":"string","minLength":1,"description":"字段 accept（语义见对应领域契约） / Field accept"},"maxSizeBytes":{"type":"integer","description":"字段 maxSizeBytes（语义见对应领域契约） / Field maxSizeBytes"},"chunkSizeBytes":{"type":"integer","description":"字段 chunkSizeBytes（语义见对应领域契约） / Field chunkSizeBytes"},"onProgress":{"type":"string","minLength":1,"description":"字段 onProgress（语义见对应领域契约） / Field onProgress"}},"required":["accept","maxSizeBytes","chunkSizeBytes","onProgress"]}
---
