---
uid: e4a526c8
id: bili.live.gift
parent: bili.live
state: planned
tags: [planned, "worker:W-LIVE", leaf]
name: {zh: "礼物与舰队", en: "Gifts and fleets"}
description:
  zh: >
      礼物目录、送礼、舰队与醒目留言、余额校验与账本分录
  en: >
      Gift catalog, sending, fleets,醒目留言, balance checks and ledger entries
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/live/gift/src/gift.ts"
  - path: "services/live/gift/src/fleet.ts"
  - path: "services/live/gift/tests/gift.test.ts"
  - path: "services/live/gift/tests/fleet.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/live/gifts"
    description:
      zh: >
          送礼并写账本
      en: >
          Send a gift and write the ledger
    input: {module: "bili.live.gift", name: "SendGiftRequest"}
    output: {module: "bili.contract.ledger", name: "LedgerEntry"}
  - protocol: http
    method: GET
    path: "/api/v1/live/gift-catalog"
    description:
      zh: >
          礼物目录
      en: >
          Gift catalog
    output: {module: "bili.live.gift", name: "GiftPage"}
  - protocol: http
    method: POST
    path: "/api/v1/live/super-chats"
    description:
      zh: >
          发送醒目留言（文本必填）
      en: >
          Send a super chat with mandatory text
    input: {module: "bili.live.gift", name: "SendSuperChatRequest"}
    output: {module: "bili.contract.ledger", name: "LedgerEntry"}
types:
  - name: "GiftCatalogItem"
    description: {zh: "礼物目录项", en: "Gift catalog item"}
    schema: {"type":"object","description":"礼物目录项 / Gift catalog item","additionalProperties":false,"properties":{"giftId":{"$ref":"urn:normify:bili.contract.common:Id","description":"礼物 ID / Gift id"},"name":{"type":"string","minLength":1,"description":"字段 name（语义见对应领域契约） / Field name"},"price":{"$ref":"urn:normify:bili.contract.common:Money","description":"字段 price（语义见对应领域契约） / Field price"},"kind":{"type":"string","enum":["NORMAL","FLEET","SC_CHAT"],"description":"字段 kind（语义见对应领域契约） / Field kind"},"fleetTier":{"type":"integer","description":"舰队档位 / Fleet tier"},"durationDays":{"type":"integer","description":"字段 durationDays（语义见对应领域契约） / Field durationDays"}},"required":["giftId","name","price","kind"]}
  - name: "SendGiftRequest"
    description: {zh: "送礼请求", en: "Send gift request"}
    schema: {"type":"object","description":"送礼请求 / Send gift request","additionalProperties":false,"properties":{"roomId":{"$ref":"urn:normify:bili.contract.common:Id","description":"直播间 ID / Live room id"},"giftId":{"$ref":"urn:normify:bili.contract.common:Id","description":"礼物 ID / Gift id"},"giftCount":{"type":"integer","description":"礼物数量 / Gift count"},"messageText":{"type":"string","minLength":1,"description":"字段 messageText（语义见对应领域契约） / Field messageText"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["roomId","giftId","giftCount","idempotencyKey","requestContext"]}
  - name: "FleetMembership"
    description: {zh: "舰队会员", en: "Fleet membership"}
    schema: {"type":"object","description":"舰队会员 / Fleet membership","additionalProperties":false,"properties":{"fleetId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 fleetId（语义见对应领域契约） / Field fleetId"},"userId":{"$ref":"urn:normify:bili.contract.common:Id","description":"用户 ID / User id"},"roomId":{"$ref":"urn:normify:bili.contract.common:Id","description":"直播间 ID / Live room id"},"tier":{"type":"integer","description":"字段 tier（语义见对应领域契约） / Field tier"},"validFrom":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"生效时间 / Valid from"},"validTo":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"失效时间 / Valid to"},"benefits":{"type":"array","items":{"$ref":"urn:normify:bili.live.gift:FleetBenefit"},"description":"字段 benefits（语义见对应领域契约） / Field benefits"}},"required":["fleetId","userId","roomId","tier","validFrom","validTo","benefits"]}
  - name: "FleetBenefit"
    description: {zh: "舰队权益", en: "Fleet benefit"}
    schema: {"type":"object","description":"舰队权益 / Fleet benefit","additionalProperties":false,"properties":{"benefitCode":{"type":"string","minLength":1,"description":"字段 benefitCode（语义见对应领域契约） / Field benefitCode"},"description":{"type":"string","minLength":1,"description":"字段 description（语义见对应领域契约） / Field description"},"expiresAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"字段 expiresAt（语义见对应领域契约） / Field expiresAt"}},"required":["benefitCode","description"]}
  - name: "SendSuperChatRequest"
    description: {zh: "发送醒目留言请求", en: "Send super chat request"}
    schema: {"type":"object","description":"发送醒目留言请求 / Send super chat request","additionalProperties":false,"properties":{"roomId":{"$ref":"urn:normify:bili.contract.common:Id","description":"直播间 ID / Live room id"},"giftId":{"$ref":"urn:normify:bili.contract.common:Id","description":"礼物 ID / Gift id"},"messageText":{"type":"string","minLength":1,"description":"字段 messageText（语义见对应领域契约） / Field messageText"},"giftCount":{"type":"integer","description":"礼物数量 / Gift count"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["roomId","giftId","messageText","giftCount","idempotencyKey","requestContext"]}
  - name: "GiftPage"
    description: {zh: "领域分页响应", en: "Domain page response"}
    schema: {"type":"object","additionalProperties":false,"description":"领域分页响应 / Domain page response｜与 PageResult 完全相同的分页封套字段（items/total/nextCursor/hasMore），items 使用该领域具名条目契约 / Same envelope fields as PageResult with domain-specific typed items","properties":{"items":{"type":"array","items":{"$ref":"urn:normify:bili.live.gift:GiftCatalogItem"},"description":"领域条目列表 / Domain item list"},"total":{"type":"integer","minimum":0,"description":"总条数 / Total count"},"nextCursor":{"type":"string","description":"下一页游标 / Next page cursor"},"hasMore":{"type":"boolean","description":"是否还有下一页 / Whether more pages exist"}},"required":["items","hasMore"]}
deps:
  - kind: call
    to: bili.commerce.wallet
    label: {zh: "余额与冻结校验", en: "Balance and freeze checks"}
  - kind: call
    to: bili.commerce.ledger
    label: {zh: "礼物与舰队账本分录", en: "Gift and fleet ledger entries"}
  - kind: call
    to: bili.infra.db
    label: {zh: "事务读写与表所有权校验", en: "Transactional persistence and"}
  - kind: event
    to: bili.infra.outbox
    label: {zh: "异步事件出箱与重试", en: "Async event outbox and retry"}
  - kind: reference
    to: bili.contract.common
    label: {zh: "统一 ID/时间/分页/错误契约", en: "Unified id, time, pagination"}
---
