---
uid: cbfd911b
id: bili.live.gift
parent: bili.live
state: planned
tags: ["worker:live-gift"]
name: {zh: "礼物、舰队与醒目留言", en: "Gifts, Guards and Super Chat"}
description:
  zh: >
      礼物目录与价格、连击送礼、舰队订阅、醒目留言排序展示；礼物与分成写入独立账本分录。
      
  en: >
      Gift catalog and pricing, combo sending, guard subscriptions, super chat ordering; ledger entries per gift.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/live/gift/src/catalog.ts"
  - path: "services/live/gift/src/send.ts"
  - path: "services/live/gift/migrations/0001_live_gift.sql"
  - path: "services/live/gift/tests/gift.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/live/gifts"
    description:
      zh: >
          读取礼物目录
          
      en: >
          Get gift catalog
          
    output: {module: "bili.live.gift", name: "GiftCatalogItem"}
  - protocol: http
    method: POST
    path: "/api/v1/live/rooms/{id}/gifts"
    description:
      zh: >
          送礼（扣款+账本分录）
          
      en: >
          Send gift
          
    input: {module: "bili.live.gift", name: "GiftSendRequest"}
    output: {module: "bili.live.gift", name: "GiftLedgerEntry"}
  - protocol: http
    method: POST
    path: "/api/v1/live/rooms/{id}/guards"
    description:
      zh: >
          开通/续费舰队
          
      en: >
          Subscribe guard
          
    input: {module: "bili.live.gift", name: "GuardSubscription"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: POST
    path: "/api/v1/live/rooms/{id}/super-chat"
    description:
      zh: >
          发送醒目留言
          
      en: >
          Send super chat
          
    input: {module: "bili.live.gift", name: "GiftSendRequest"}
    output: {module: "bili.live.gift", name: "GiftLedgerEntry"}
  - protocol: mysql
    path: "live_gift_ledger_entry"
    description:
      zh: >
          礼物账本分录表（唯一写入所有者：直播礼物服务）
          
      en: >
          gift ledger table
          
types:
  - name: "GiftCatalogItem"
    description: {zh: "礼物目录项", en: "Gift catalog item"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 gift_catalog_item；价格变更需审计","properties":{"giftId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"name":{"type":"string","description":"礼物名","maxLength":20},"iconAssetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"kind":{"type":"string","enum":["normal","guard","super_chat","lottery","room_specific"],"description":"类型"},"priceCoins":{"type":"integer","description":"价格（电池/硬币最小单位）","minimum":1},"guardLevel":{"type":"string","enum":["none","governor","admiral","captain"],"description":"舰队等级"},"comboEnabled":{"type":"boolean","description":"是否支持连击"},"availableFrom":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"availableTo":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"state":{"type":"string","enum":["active","off_shelf","sold_out"],"description":"状态"}},"required":["giftId","name","kind","priceCoins","state"]}
  - name: "GiftSendRequest"
    description: {zh: "送礼请求", en: "Gift send request"}
    schema: {"type":"object","additionalProperties":false,"description":"扣款与入账必须同事务写账本分录","properties":{"roomId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"senderId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"giftId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"count":{"type":"integer","description":"数量","minimum":1,"maximum":9999},"comboId":{"type":"string","description":"连击批次 id"},"message":{"type":"string","description":"留言","maxLength":200},"anonymous":{"type":"boolean","description":"是否匿名"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.core.idempotency:IdempotencyKey"}},"required":["roomId","senderId","giftId","count","idempotencyKey"]}
  - name: "GiftLedgerEntry"
    description: {zh: "礼物账本分录", en: "Gift ledger entry"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 live_gift_ledger_entry（仅追加），与 ledger_transfer 对应","properties":{"entryId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"roomId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"senderId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"anchorId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"giftId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"count":{"type":"integer","description":"数量","minimum":1},"totalCoins":{"type":"integer","description":"总价（最小单位）","minimum":0},"platformShareCoins":{"type":"integer","description":"平台分成","minimum":0},"anchorShareCoins":{"type":"integer","description":"主播分成","minimum":0},"transferId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"createdAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["entryId","roomId","senderId","anchorId","giftId","count","totalCoins","transferId"]}
  - name: "GuardSubscription"
    description: {zh: "舰队订阅", en: "Guard subscription"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 guard_subscription","properties":{"guardId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"userId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"anchorId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"level":{"type":"string","enum":["governor","admiral","captain"],"description":"等级"},"priceCoins":{"type":"integer","description":"价格","minimum":1},"startAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"endAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"autoRenew":{"type":"boolean","description":"是否自动续费"},"state":{"type":"string","enum":["active","expired","refunded"],"description":"状态"}},"required":["guardId","userId","anchorId","level","startAt","endAt"]}
deps:
  - kind: reference
    to: bili.data.ledger
    label: {zh: "复用统一复式账本结构", en: "Reuse ledger tables"}
  - kind: call
    to: bili.community.coin
    from_api: "POST /api/v1/live/rooms/{id}/gifts"
    to_api: "GET /api/v1/coins/balance"
    label: {zh: "账户余额与扣款校验", en: "Balance check and debit"}
  - kind: call
    to: bili.live.danmaku
    label: {zh: "礼物/舰队播报进弹幕流", en: "Gift notice into chat"}
  - kind: event
    to: bili.contract.core.events
    label: {zh: "送礼事件驱动榜单与结算", en: "Gift events feed settlement"}
  - kind: call
    to: bili.infra.observability
    label: {zh: "资金类操作审计", en: "Audit money-like actions"}
---
