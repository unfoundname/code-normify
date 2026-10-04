---
uid: 2bbb60e0
id: bili.client.studio.content
parent: bili.client.studio
state: planned
tags: [planned, "worker:W-CREATOR", leaf]
name: {zh: "稿件与合集编辑", en: "Work and collection editor"}
description:
  zh: >
      稿件编辑、合集编排、封面与预约
  en: >
      Work editing, collection arrangement, covers and scheduling
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/studio/src/features/content/ContentEditor.tsx"
  - path: "apps/studio/tests/features/content/ContentEditor.test.tsx"
apis:
  - protocol: http
    method: GET
    path: "/studio/content/:draftId"
    description:
      zh: >
          内容编辑路由
      en: >
          Content editor route
    output: {module: "bili.client.studio.content", name: "ContentEditorModel"}
types:
  - name: "ContentEditorModel"
    description: {zh: "内容编辑模型", en: "Content editor model"}
    schema: {"type":"object","description":"内容编辑模型 / Content editor model","additionalProperties":false,"properties":{"draft":{"$ref":"urn:normify:bili.upload.draft:VideoDraftView","description":"字段 draft（语义见对应领域契约） / Field draft"},"parts":{"type":"array","items":{"$ref":"urn:normify:bili.upload.part:VideoPart"},"description":"字段 parts（语义见对应领域契约） / Field parts"},"collections":{"type":"array","items":{"$ref":"urn:normify:bili.upload.collection:CollectionView"},"description":"字段 collections（语义见对应领域契约） / Field collections"}},"required":["draft","parts","collections"]}
deps:
  - kind: call
    to: bili.upload.draft
    label: {zh: "草稿编辑", en: "Draft editing"}
  - kind: call
    to: bili.upload.collection
    label: {zh: "合集编排", en: "Collection arrangement"}
  - kind: call
    to: bili.client.shared.http
    label: {zh: "统一请求层与错误形态", en: "Unified request layer and"}
  - kind: reference
    to: bili.client.shared.design
    label: {zh: "设计系统与组件", en: "Design system and components"}
---
