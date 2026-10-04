---
uid: 734025f1
id: bili.channel.mall
parent: bili.channel
state: planned
tags: [planned, "worker:W-CHANNEL", leaf]
name: {zh: "会员购", en: "Membership mall"}
description:
  zh: >
      商品目录、库存、下单与发货协同
  en: >
      Goods catalog, inventory, ordering and fulfillment collaboration
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/channel/mall/src/mall.ts"
  - path: "services/channel/mall/tests/mall.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/channel/goods"
    description:
      zh: >
          商品目录
      en: >
          Goods catalog
    output: {module: "bili.channel.mall", name: "GoodsPage"}
types:
  - name: "GoodsView"
    description: {zh: "商品视图", en: "Goods view"}
    schema: {"type":"object","description":"商品视图 / Goods view","additionalProperties":false,"properties":{"goodsId":{"$ref":"urn:normify:bili.contract.common:Id","description":"商品 ID / Goods id"},"title":{"type":"string","minLength":1,"description":"标题 / Title"},"price":{"$ref":"urn:normify:bili.contract.common:Money","description":"字段 price（语义见对应领域契约） / Field price"},"stock":{"type":"integer","description":"字段 stock（语义见对应领域契约） / Field stock"},"kind":{"type":"string","enum":["TICKET","GOODS","DIGITAL","DRESS_UP"],"description":"字段 kind（语义见对应领域契约） / Field kind"},"onSale":{"type":"boolean","description":"字段 onSale（语义见对应领域契约） / Field onSale"}},"required":["goodsId","title","price","stock","kind","onSale"]}
  - name: "GoodsPage"
    description: {zh: "领域分页响应", en: "Domain page response"}
    schema: {"type":"object","additionalProperties":false,"description":"领域分页响应 / Domain page response｜与 PageResult 完全相同的分页封套字段（items/total/nextCursor/hasMore），items 使用该领域具名条目契约 / Same envelope fields as PageResult with domain-specific typed items","properties":{"items":{"type":"array","items":{"$ref":"urn:normify:bili.channel.mall:GoodsView"},"description":"领域条目列表 / Domain item list"},"total":{"type":"integer","minimum":0,"description":"总条数 / Total count"},"nextCursor":{"type":"string","description":"下一页游标 / Next page cursor"},"hasMore":{"type":"boolean","description":"是否还有下一页 / Whether more pages exist"}},"required":["items","hasMore"]}
deps:
  - kind: call
    to: bili.commerce.order
    label: {zh: "会员购下单复用统一订单", en: "Mall orders reuse the unified"}
  - kind: call
    to: bili.commerce.ledger
    label: {zh: "交易分录", en: "Transaction entries"}
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
