---
uid: 172e18cf
id: bili.creator.campaign
parent: bili.creator
state: planned
tags: ["worker:cre-growth"]
name: {zh: "活动任务与推广", en: "Campaigns and Promotion"}
description:
  zh: >
      平台任务与激励、进度判定与发奖、作品推广投放（CPM/CPC）、预算与效果、活动报名与结算。
      
  en: >
      Platform tasks and rewards, progress checks, promotion campaigns (CPM/CPC), budgets, effects and settlement.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/creator/campaign/src/task.ts"
  - path: "services/creator/campaign/src/promotion.ts"
  - path: "services/creator/campaign/migrations/0001_campaign.sql"
  - path: "services/creator/campaign/tests/campaign.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/creator/tasks"
    description:
      zh: >
          列出可参与任务与进度
          
      en: >
          List tasks
          
    output: {module: "bili.creator.campaign", name: "CreatorTaskProgress"}
  - protocol: http
    method: POST
    path: "/api/v1/creator/promotions"
    description:
      zh: >
          创建推广投放（生成订单）
          
      en: >
          Create promotion
          
    input: {module: "bili.creator.campaign", name: "PromotionOrder"}
    output: {module: "bili.commerce.order", name: "OrderRecord"}
  - protocol: http
    method: GET
    path: "/api/v1/creator/promotions/{id}"
    description:
      zh: >
          读取投放效果
          
      en: >
          Get promotion effect
          
    output: {module: "bili.creator.campaign", name: "PromotionOrder"}
  - protocol: mysql
    path: "creator_task"
    description:
      zh: >
          创作任务表（唯一写入所有者：活动服务）
          
      en: >
          creator_task table
          
types:
  - name: "CreatorTask"
    description: {zh: "创作任务", en: "Creator task"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 creator_task","properties":{"taskId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"code":{"type":"string","description":"任务码"},"title":{"type":"string","description":"标题","maxLength":80},"description":{"type":"string","description":"说明","maxLength":500},"goalType":{"type":"string","enum":["publish_count","play_count","danmaku_count","follower_gain","live_hours","course_sales"],"description":"目标类型"},"targetValue":{"type":"integer","description":"目标值","minimum":1},"rewardType":{"type":"string","enum":["coin","battery","membership_days","cash","exposure"],"description":"奖励类型"},"rewardAmount":{"type":"integer","description":"奖励额度","minimum":0},"periodStart":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"periodEnd":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"state":{"type":"string","enum":["draft","active","paused","ended"],"description":"状态"},"audienceFilter":{"type":"string","description":"参与条件"}},"required":["taskId","code","goalType","targetValue","rewardType","state"]}
  - name: "CreatorTaskProgress"
    description: {zh: "任务进度", en: "Task progress"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 creator_task_progress，唯一约束 task_id+owner_id","properties":{"taskId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"ownerId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"currentValue":{"type":"integer","description":"当前值","minimum":0},"targetValue":{"type":"integer","description":"目标值","minimum":1},"completed":{"type":"boolean","description":"是否达成"},"rewardedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"updatedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["taskId","ownerId","currentValue","targetValue","completed"]}
  - name: "PromotionOrder"
    description: {zh: "推广投放", en: "Promotion order"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 promotion_order；投放消耗由事件投影统计","properties":{"promotionId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"ownerId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"videoId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"bidType":{"type":"string","enum":["cpm","cpc"],"description":"计费方式"},"budget":{"$ref":"urn:normify:bili.contract.core.ids:MoneyAmount"},"dailyBudget":{"$ref":"urn:normify:bili.contract.core.ids:MoneyAmount"},"startAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"endAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"state":{"type":"string","enum":["pending_payment","pending_review","active","paused","finished","rejected","refunded"],"description":"状态机"},"spentAmount":{"$ref":"urn:normify:bili.contract.core.ids:MoneyAmount"},"impressions":{"type":"integer","description":"曝光数（投影）","minimum":0},"clicks":{"type":"integer","description":"点击数（投影）","minimum":0},"targetingJson":{"type":"string","description":"定向条件 JSON"},"orderId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"}},"required":["promotionId","ownerId","videoId","bidType","budget","state"]}
deps:
  - kind: call
    to: bili.publish.catalog
    from_api: "POST /api/v1/creator/promotions"
    to_api: "GET /api/v1/catalog/videos/{videoId}"
    label: {zh: "推广仅可投已发布视频", en: "Promote published videos only"}
  - kind: call
    to: bili.commerce.order
    from_api: "POST /api/v1/creator/promotions"
    to_api: "POST /api/v1/orders"
    label: {zh: "推广费走订单支付", en: "Promotion fee via order"}
  - kind: call
    to: bili.community.coin
    label: {zh: "硬币类任务奖励发放", en: "Coin rewards"}
  - kind: event
    to: bili.contract.core.events
    label: {zh: "任务进度事件与发奖", en: "Task progress events"}
  - kind: dataflow
    to: bili.data.projections
    label: {zh: "投放效果为事件投影", en: "Promotion effect is a projecti"}
---
