---
uid: 129fc7ba
id: bili.client.creator.works
parent: bili.client.creator
state: planned
tags: ["worker:stu-works"]
name: {zh: "投稿管理页", en: "Work Management UI"}
description:
  zh: >
      创作中心稿件列表、三状态机进度、驳回原因与批量下架/改可见性。
      
  en: >
      Studio work list, three-state-machine progress, reject reasons and batch takedown/visibility.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/studio/src/features/works/index.ts"
  - path: "apps/studio/src/features/works/pages/WorkListPage.tsx"
  - path: "apps/studio/src/features/works/tests/works.test.tsx"
apis: []
types:
  - name: "StudioWorkListState"
    description: {zh: "稿件列表状态", en: "Studio work list state"}
    schema: {"type":"object","additionalProperties":false,"properties":{"query":{"$ref":"urn:normify:bili.creator.works:CreatorWorkQuery"},"items":{"type":"array","description":"稿件","items":{"$ref":"urn:normify:bili.creator.works:CreatorWorkItem"}},"selection":{"type":"array","description":"已选稿件","items":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"}},"error":{"$ref":"urn:normify:bili.contract.core.errors:ApiError"}},"required":["items"]}
deps:
  - kind: call
    to: bili.creator.works
    to_api: "GET /api/v1/creator/works"
    label: {zh: "稿件列表与批量动作", en: "Work list and batch actions"}
---
