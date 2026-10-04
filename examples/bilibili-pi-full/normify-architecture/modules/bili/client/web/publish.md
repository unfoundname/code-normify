---
uid: 4f8bfbbe
id: bili.client.web.publish
parent: bili.client.web
state: planned
tags: [planned, "worker:W-CONTENT", leaf]
name: {zh: "投稿台", en: "Publish workspace"}
description:
  zh: >
      草稿编辑、分 P、封面上传、合集、联合投稿与预约
  en: >
      Draft editing, parts, cover upload, collections, co-authoring and scheduling
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/web/src/features/publish/PublishWorkspace.tsx"
  - path: "apps/web/src/features/publish/part-editor.tsx"
  - path: "apps/web/tests/features/publish/PublishWorkspace.test.tsx"
  - path: "apps/web/tests/features/publish/part-editor.test.tsx"
apis:
  - protocol: http
    method: GET
    path: "/upload"
    description:
      zh: >
          投稿台路由
      en: >
          Publish route
    output: {module: "bili.client.web.publish", name: "PublishWorkspaceModel"}
types:
  - name: "PublishWorkspaceModel"
    description: {zh: "投稿台视图模型", en: "Publish workspace model"}
    schema: {"type":"object","description":"投稿台视图模型 / Publish workspace model","additionalProperties":false,"properties":{"draft":{"$ref":"urn:normify:bili.upload.draft:VideoDraftView","description":"字段 draft（语义见对应领域契约） / Field draft"},"parts":{"type":"array","items":{"$ref":"urn:normify:bili.upload.part:VideoPart"},"description":"字段 parts（语义见对应领域契约） / Field parts"},"schedule":{"$ref":"urn:normify:bili.upload.schedule:PublishSchedule","description":"字段 schedule（语义见对应领域契约） / Field schedule"}},"required":["parts"]}
deps:
  - kind: call
    to: bili.upload.draft
    label: {zh: "草稿读写", en: "Draft read and write"}
  - kind: call
    to: bili.upload.part
    label: {zh: "分 P 编辑", en: "Part editing"}
  - kind: call
    to: bili.upload.schedule
    label: {zh: "预约发布", en: "Scheduled publishing"}
  - kind: call
    to: bili.catalog.video
    label: {zh: "提交发布命令", en: "Submit the publish command"}
  - kind: call
    to: bili.client.shared.http
    label: {zh: "统一请求层与错误形态", en: "Unified request layer and"}
  - kind: reference
    to: bili.client.shared.design
    label: {zh: "设计系统与组件", en: "Design system and components"}
---
