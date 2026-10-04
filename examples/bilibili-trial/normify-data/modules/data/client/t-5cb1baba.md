---
uid: cf8c9400
id: data.client.t-5cb1baba
parent: data.client
state: planned
tags: ["worker:stu-growth", "projection:data-contract"]
name: {zh: "CampaignPageState", en: "CampaignPageState"}
description:
  zh: >
      活动页状态
  en: >
      Campaign page state
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/client/t-5cb1baba.json"
apis: []
types:
  - name: "CampaignPageState"
    description: {zh: "活动页状态", en: "Campaign page state"}
    schema: {"type":"object","additionalProperties":false,"properties":{"tasks":{"type":"array","description":"任务进度","items":{"$ref":"urn:normify:data.creator.t-dafcb7df:CreatorTaskProgress"}},"promotions":{"type":"array","description":"投放","items":{"$ref":"urn:normify:data.creator.t-129cf011:PromotionOrder"}},"budgetDraft":{"$ref":"urn:normify:data.contract.t-d2d2c734:MoneyAmount"},"error":{"$ref":"urn:normify:data.contract.t-2bb69fd6:ApiError"}},"required":["tasks"]}
deps:
  - kind: reference
    to: data.creator.t-dafcb7df
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.creator.t-129cf011
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-d2d2c734
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-2bb69fd6
    label: {zh: "类型引用", en: "Type reference"}
---
