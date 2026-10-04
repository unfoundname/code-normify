---
uid: 5cbcf086
id: bili.ops.curation
parent: bili.ops
state: planned
tags: ["worker:ops-curation"]
name: {zh: "推荐位、活动与标签", en: "Curation, Activities and Labels"}
description:
  zh: >
      人工推荐位排期与权重、活动/专题配置、分类标签与别名治理、内容池准入规则；推荐位是首页区段的输入。
      
  en: >
      Manual slots and weights, activities, category labels and aliases, content pool rules feeding home sections.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/ops/curation/src/slot.ts"
  - path: "services/ops/curation/src/label.ts"
  - path: "services/ops/curation/migrations/0001_curation.sql"
  - path: "services/ops/curation/tests/curation.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/ops/recommend-slots"
    description:
      zh: >
          创建/调整推荐位
          
      en: >
          Upsert recommend slot
          
    input: {module: "bili.ops.curation", name: "RecommendSlot"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: GET
    path: "/api/v1/ops/recommend-slots"
    description:
      zh: >
          推荐位列表
          
      en: >
          List slots
          
    input: {module: "bili.contract.core.paging", name: "PageRequest"}
    output: {module: "bili.ops.curation", name: "RecommendSlot"}
  - protocol: http
    method: POST
    path: "/api/v1/ops/activities"
    description:
      zh: >
          创建活动
          
      en: >
          Create activity
          
    input: {module: "bili.ops.curation", name: "ActivityRecord"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: POST
    path: "/api/v1/ops/labels"
    description:
      zh: >
          维护分类标签
          
      en: >
          Upsert label
          
    input: {module: "bili.ops.curation", name: "CategoryLabel"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: mysql
    path: "recommend_slot"
    description:
      zh: >
          推荐位表（唯一写入所有者：运营配置服务）
          
      en: >
          recommend_slot table
          
types:
  - name: "RecommendSlot"
    description: {zh: "推荐位", en: "Recommend slot"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 recommend_slot，索引 position+state+start_at","properties":{"slotId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"position":{"type":"string","enum":["home_banner","home_grid","partition_top","search_top","live_entry","player_side"],"description":"位置"},"title":{"type":"string","description":"标题","maxLength":60},"targetType":{"type":"string","enum":["video","season","course","live_room","activity","article","audio","manga"],"description":"对象类型"},"targetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"weight":{"type":"integer","description":"权重","minimum":0,"maximum":10000},"orderIndex":{"type":"integer","description":"排序","minimum":0},"startAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"endAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"state":{"type":"string","enum":["draft","pending_review","scheduled","active","ended","rejected"],"description":"状态机"},"operatorId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"regionAllow":{"type":"array","description":"可见地域","items":{"type":"string","description":"ISO 3166-1 alpha-2"}}},"required":["slotId","position","targetType","targetId","startAt","endAt","state"]}
  - name: "ActivityRecord"
    description: {zh: "活动/专题", en: "Activity"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 activity","properties":{"activityId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"title":{"type":"string","description":"活动标题","maxLength":80},"subTitle":{"type":"string","description":"副标题","maxLength":120},"type":{"type":"string","enum":["campaign","contest","exhibition","holiday","course_promo"],"description":"类型"},"bannerAssetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"startAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"endAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"entryUrl":{"type":"string","description":"入口链接"},"ruleText":{"type":"string","description":"规则说明","maxLength":4000},"state":{"type":"string","enum":["draft","pending_review","published","ended","offline"],"description":"状态机"}},"required":["activityId","title","type","startAt","endAt","state"]}
  - name: "CategoryLabel"
    description: {zh: "分类标签", en: "Category label"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 category_label，唯一约束 type+name；合并保留别名映射","properties":{"labelId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"name":{"type":"string","description":"标签名","maxLength":40},"type":{"type":"string","enum":["tag","category","region","language","year","topic"],"description":"类型"},"parentId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"orderIndex":{"type":"integer","description":"排序","minimum":0},"aliasOf":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"state":{"type":"string","enum":["active","hidden","merged"],"description":"状态"},"searchable":{"type":"boolean","description":"是否参与检索"}},"required":["labelId","name","type","state"]}
deps:
  - kind: call
    to: bili.discovery.search
    label: {zh: "标签与别名下发索引", en: "Labels to index"}
  - kind: call
    to: bili.publish.catalog
    from_api: "POST /api/v1/ops/recommend-slots"
    to_api: "GET /api/v1/catalog/videos/{videoId}"
    label: {zh: "推荐对象必须是已发布内容", en: "Promote published content only"}
  - kind: call
    to: bili.infra.observability
    label: {zh: "运营配置变更审计", en: "Audit curation changes"}
---
