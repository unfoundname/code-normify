---
uid: f779e169
id: data.client.t-c1bf59aa
parent: data.client
state: planned
tags: ["worker:web-publish", "projection:data-contract"]
name: {zh: "PublishWorkbenchState", en: "PublishWorkbenchState"}
description:
  zh: >
      投稿工作台状态
  en: >
      Publish workbench state
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/client/t-c1bf59aa.json"
apis: []
types:
  - name: "PublishWorkbenchState"
    description: {zh: "投稿工作台状态", en: "Publish workbench state"}
    schema: {"type":"object","additionalProperties":false,"properties":{"videoId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"submission":{"$ref":"urn:normify:data.publish.t-900e64f8:VideoSubmission"},"pipeline":{"$ref":"urn:normify:data.media.t-115f4cef:MediaPipelineState"},"upload":{"$ref":"urn:normify:data.publish.t-7715eaa3:UploadResumeState"},"canSubmitReview":{"type":"boolean","description":"是否可提交审核"},"blockingReasons":{"type":"array","description":"阻塞原因","items":{"type":"string","description":"原因码"}}},"required":["videoId","canSubmitReview","blockingReasons"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.publish.t-900e64f8
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.media.t-115f4cef
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.publish.t-7715eaa3
    label: {zh: "类型引用", en: "Type reference"}
---
