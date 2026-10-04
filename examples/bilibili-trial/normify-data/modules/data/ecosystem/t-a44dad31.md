---
uid: de07b1af
id: data.ecosystem.t-a44dad31
parent: data.ecosystem
state: planned
tags: ["worker:eco-mall", "projection:data-contract"]
name: {zh: "MallProduct", en: "MallProduct"}
description:
  zh: >
      会员购商品（外部投影）
  en: >
      Mall product (projection)
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/ecosystem/t-a44dad31.json"
apis: []
types:
  - name: "MallProduct"
    description: {zh: "会员购商品（外部投影）", en: "Mall product (projection)"}
    schema: {"type":"object","additionalProperties":false,"description":"权威数据在外部系统；本站仅投影，禁止当作权威库存","properties":{"productId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"externalSkuId":{"type":"string","description":"外部 SKU"},"title":{"type":"string","description":"商品标题","maxLength":120},"categoryId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"price":{"$ref":"urn:normify:data.contract.t-d2d2c734:MoneyAmount"},"stock":{"type":"integer","description":"库存（外部同步）","minimum":0},"externalProvider":{"type":"string","enum":["pending_decision","self_operated","third_party"],"description":"外部提供方（待决策）"},"images":{"type":"array","description":"图片资产","items":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"}},"state":{"type":"string","enum":["on_sale","sold_out","off_shelf"],"description":"状态"},"syncedAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"},"detailUrl":{"type":"string","description":"外部详情链接"}},"required":["productId","externalSkuId","title","price","state","syncedAt"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-d2d2c734
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-7a625dbd
    label: {zh: "类型引用", en: "Type reference"}
---
