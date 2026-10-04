---
uid: 9faf1143
id: bili.ecosystem.mall
parent: bili.ecosystem
state: planned
tags: ["worker:eco-mall"]
name: {zh: "会员购（外部集成边界）", en: "Mall (External Boundary)"}
description:
  zh: >
      商品目录与库存来自外部电商（实现待决策），本站只保留商品投影、下单桥接与订单状态同步边界。
      
  en: >
      Catalogue and stock come from an external commerce provider; this platform keeps a projection and order bridge.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/ecosystem/mall/src/bridge.ts"
  - path: "services/ecosystem/mall/migrations/0001_mall.sql"
  - path: "services/ecosystem/mall/tests/mall.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/mall/products"
    description:
      zh: >
          列出会员购商品（投影）
          
      en: >
          List mall products
          
    input: {module: "bili.contract.core.paging", name: "PageRequest"}
    output: {module: "bili.ecosystem.mall", name: "MallProduct"}
  - protocol: http
    method: POST
    path: "/api/v1/mall/orders/bridge"
    description:
      zh: >
          创建订单桥接
          
      en: >
          Create order bridge
          
    input: {module: "bili.ecosystem.mall", name: "MallOrderBridge"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: mysql
    path: "mall_order_bridge"
    description:
      zh: >
          订单桥接表（唯一写入所有者：会员购服务）
          
      en: >
          mall_order_bridge table
          
types:
  - name: "MallProduct"
    description: {zh: "会员购商品（外部投影）", en: "Mall product (projection)"}
    schema: {"type":"object","additionalProperties":false,"description":"权威数据在外部系统；本站仅投影，禁止当作权威库存","properties":{"productId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"externalSkuId":{"type":"string","description":"外部 SKU"},"title":{"type":"string","description":"商品标题","maxLength":120},"categoryId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"price":{"$ref":"urn:normify:bili.contract.core.ids:MoneyAmount"},"stock":{"type":"integer","description":"库存（外部同步）","minimum":0},"externalProvider":{"type":"string","enum":["pending_decision","self_operated","third_party"],"description":"外部提供方（待决策）"},"images":{"type":"array","description":"图片资产","items":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"}},"state":{"type":"string","enum":["on_sale","sold_out","off_shelf"],"description":"状态"},"syncedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"detailUrl":{"type":"string","description":"外部详情链接"}},"required":["productId","externalSkuId","title","price","state","syncedAt"]}
  - name: "MallOrderBridge"
    description: {zh: "订单桥接", en: "Order bridge"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 mall_order_bridge；失败必须显式告警，不静默丢弃","properties":{"bridgeId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"orderId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"externalOrderNo":{"type":"string","description":"外部订单号"},"productId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"quantity":{"type":"integer","description":"数量","minimum":1},"state":{"type":"string","enum":["created","synced","shipped","completed","cancelled","sync_failed"],"description":"状态机"},"syncedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"lastError":{"type":"string","description":"最后错误"},"retryCount":{"type":"integer","description":"重试次数","minimum":0}},"required":["bridgeId","orderId","externalOrderNo","productId","state"]}
deps:
  - kind: call
    to: bili.commerce.order
    from_api: "POST /api/v1/mall/orders/bridge"
    to_api: "POST /api/v1/orders"
    label: {zh: "支付订单与桥接订单对应", en: "Link payment order"}
  - kind: reference
    to: bili.contract.adapters.capabilities
    label: {zh: "外部电商与支付能力待接入", en: "External commerce pending"}
  - kind: call
    to: bili.infra.jobs
    label: {zh: "同步失败重试与告警", en: "Sync retry and alert"}
  - kind: call
    to: bili.infra.observability
    label: {zh: "外部同步审计", en: "Audit external sync"}
---
