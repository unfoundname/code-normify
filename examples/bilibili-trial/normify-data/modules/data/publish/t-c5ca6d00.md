---
uid: e14f101d
id: data.publish.t-c5ca6d00
parent: data.publish
state: planned
tags: ["worker:pub-submission", "projection:data-contract"]
name: {zh: "SubmissionDraftRequest", en: "SubmissionDraftRequest"}
description:
  zh: >
      草稿创建/更新请求
  en: >
      Draft create or update request
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/publish/t-c5ca6d00.json"
apis: []
types:
  - name: "SubmissionDraftRequest"
    description: {zh: "草稿创建/更新请求", en: "Draft create or update request"}
    schema: {"type":"object","additionalProperties":false,"properties":{"title":{"type":"string","description":"标题","minLength":1,"maxLength":80},"description":{"type":"string","description":"简介","maxLength":2000},"partitionId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"tags":{"type":"array","description":"标签","items":{"type":"string","description":"标签","maxLength":20},"maxItems":10},"visibility":{"$ref":"urn:normify:data.contract.t-44cc0b8c:Visibility"},"coAuthorIds":{"type":"array","description":"联合投稿者","items":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"maxItems":5},"coverAssetId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"idempotencyKey":{"$ref":"urn:normify:data.contract.t-8cc5302d:IdempotencyKey"}},"required":["title","partitionId","idempotencyKey"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-44cc0b8c
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-8cc5302d
    label: {zh: "类型引用", en: "Type reference"}
---
