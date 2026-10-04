---
uid: "68704e85"
id: bili.ecosystem.dressup
parent: bili.ecosystem
state: planned
tags: ["worker:eco-dressup"]
name: {zh: "装扮（外部集成边界）", en: "Dress-up (External Boundary)"}
description:
  zh: >
      装扮商品（空间主题/卡片背景/头像框/弹幕皮肤/表情包）与用户持有、激活与过期；商品主数据可外部化。
      
  en: >
      Dress-up items (themes, card bg, frames, danmaku skins, emoticons), ownership, activation and expiry.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/ecosystem/dressup/src/catalog.ts"
  - path: "services/ecosystem/dressup/src/ownership.ts"
  - path: "services/ecosystem/dressup/migrations/0001_dressup.sql"
  - path: "services/ecosystem/dressup/tests/dressup.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/dressup/items"
    description:
      zh: >
          列出装扮商品
          
      en: >
          List dress-up items
          
    input: {module: "bili.contract.core.paging", name: "PageRequest"}
    output: {module: "bili.ecosystem.dressup", name: "DressupItem"}
  - protocol: http
    method: POST
    path: "/api/v1/dressup/ownerships/{id}/activate"
    description:
      zh: >
          激活装扮
          
      en: >
          Activate dress-up
          
    input: {module: "bili.contract.core.idempotency", name: "IdempotencyKey"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: mysql
    path: "user_dressup_ownership"
    description:
      zh: >
          装扮持有表（唯一写入所有者：装扮服务）
          
      en: >
          dressup ownership table
          
types:
  - name: "DressupItem"
    description: {zh: "装扮商品", en: "Dress-up item"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 dressup_item；素材包本身存 OSS","properties":{"itemId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"type":{"type":"string","enum":["space_theme","card_bg","avatar_frame","danmaku_skin","emoticon_pack","loading_skin"],"description":"类型"},"name":{"type":"string","description":"名称","maxLength":60},"coverAssetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"price":{"$ref":"urn:normify:bili.contract.core.ids:MoneyAmount"},"durationDays":{"type":"integer","description":"有效期天数（0 为永久）","minimum":0},"availableFrom":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"availableTo":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"state":{"type":"string","enum":["on_sale","off_shelf","limited"],"description":"状态"},"externalProvider":{"type":"string","enum":["pending_decision","self_operated","third_party"],"description":"外部提供方（待决策）"}},"required":["itemId","type","name","price","state"]}
  - name: "UserDressupOwnership"
    description: {zh: "装扮持有", en: "Dress-up ownership"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 user_dressup_ownership，唯一约束 user_id+item_id；同一类型同时只能激活一件","properties":{"ownershipId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"userId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"itemId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"acquiredAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"expiresAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"source":{"type":"string","enum":["purchase","activity","gift","default"],"description":"获取方式"},"active":{"type":"boolean","description":"是否当前生效"},"orderId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"}},"required":["ownershipId","userId","itemId","acquiredAt","source"]}
deps:
  - kind: call
    to: bili.commerce.order
    from_api: "POST /api/v1/dressup/ownerships/{id}/activate"
    to_api: "POST /api/v1/orders"
    label: {zh: "购买装扮走订单", en: "Purchase via order"}
  - kind: call
    to: bili.identity.profile
    label: {zh: "个人空间与卡片渲染读取装扮", en: "Space renders dress-up"}
  - kind: call
    to: bili.danmaku.prefs
    label: {zh: "弹幕皮肤与显示偏好联动", en: "Danmaku skin link"}
  - kind: reference
    to: bili.contract.adapters.capabilities
    label: {zh: "外部商品来源待接入", en: "External provider pending"}
---
