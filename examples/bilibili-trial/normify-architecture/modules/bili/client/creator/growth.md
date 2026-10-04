---
uid: dfd241af
id: bili.client.creator.growth
parent: bili.client.creator
state: planned
tags: ["worker:stu-growth"]
name: {zh: "活动任务与推广页", en: "Campaign UI"}
description:
  zh: >
      任务进度卡片、参与入口、推广投放创建与效果看板。
      
  en: >
      Task progress cards, join entries, promotion creation and effect dashboard.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/studio/src/features/growth/index.ts"
  - path: "apps/studio/src/features/growth/pages/CampaignPage.tsx"
  - path: "apps/studio/src/features/growth/tests/growth.test.tsx"
apis: []
types:
  - name: "CampaignPageState"
    description: {zh: "活动页状态", en: "Campaign page state"}
    schema: {"type":"object","additionalProperties":false,"properties":{"tasks":{"type":"array","description":"任务进度","items":{"$ref":"urn:normify:bili.creator.campaign:CreatorTaskProgress"}},"promotions":{"type":"array","description":"投放","items":{"$ref":"urn:normify:bili.creator.campaign:PromotionOrder"}},"budgetDraft":{"$ref":"urn:normify:bili.contract.core.ids:MoneyAmount"},"error":{"$ref":"urn:normify:bili.contract.core.errors:ApiError"}},"required":["tasks"]}
deps:
  - kind: call
    to: bili.creator.campaign
    to_api: "GET /api/v1/creator/tasks"
    label: {zh: "任务与推广", en: "Tasks and promotions"}
---
