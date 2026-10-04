---
uid: 59ecc2af
id: bili.publish.catalog
parent: bili.publish
state: planned
tags: ["worker:pub-catalog"]
name: {zh: "目录与唯一发布命令", en: "Catalog and Sole Publish Command"}
description:
  zh: >
      唯一对外发布状态与命令入口：发布、改元数据、下架、恢复、排期；发布事件驱动搜索/推荐/动态投影。
      
  en: >
      Sole publish state and command entry: publish, metadata update, takedown, restore, schedule; emits projection events.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/publish/catalog/src/command.ts"
  - path: "services/publish/catalog/src/query.ts"
  - path: "services/publish/catalog/migrations/0001_catalog.sql"
  - path: "services/publish/catalog/tests/catalog.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/catalog/videos/{videoId}/commands"
    description:
      zh: >
          执行发布命令（唯一入口）
          
      en: >
          Execute publish command
          
    input: {module: "bili.publish.catalog", name: "PublishCommand"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: GET
    path: "/api/v1/catalog/videos/{videoId}"
    description:
      zh: >
          读取目录视频
          
      en: >
          Get catalog video
          
    output: {module: "bili.publish.catalog", name: "CatalogVideo"}
  - protocol: http
    method: GET
    path: "/api/v1/catalog/videos"
    description:
      zh: >
          按分区/标签列出已发布视频
          
      en: >
          List published videos
          
    input: {module: "bili.contract.core.paging", name: "PageRequest"}
    output: {module: "bili.publish.catalog", name: "CatalogVideoPage"}
  - protocol: mysql
    path: "catalog_video"
    description:
      zh: >
          目录视频表（唯一写入所有者：目录服务）
          
      en: >
          catalog_video table
          
  - protocol: amqp
    path: "publish.video.published"
    description:
      zh: >
          发布事件主题（当前由 outbox 派发）
          
      en: >
          Published event topic
          
    input: {module: "bili.publish.catalog", name: "VideoPublishedPayload"}
types:
  - name: "CatalogVideo"
    description: {zh: "目录视频（已发布态）", en: "Catalog video"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 catalog_video，唯一写入所有者 bili.publish.catalog；搜索/推荐/动态仅消费其事件","properties":{"videoId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"ownerId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"title":{"type":"string","description":"标题","maxLength":80},"coverAssetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"durationMs":{"type":"integer","description":"时长毫秒","minimum":0},"partitionId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"tags":{"type":"array","description":"标签","items":{"type":"string","description":"标签","maxLength":20}},"visibility":{"$ref":"urn:normify:bili.contract.core.ids:Visibility"},"state":{"type":"string","enum":["unpublished","published","scheduled","taken_down","copyright_blocked"],"description":"发布状态机"},"renditions":{"type":"array","description":"可用清晰度","items":{"type":"string","description":"档位 id"}},"subtitleLangs":{"type":"array","description":"字幕语言","items":{"type":"string","description":"语言"}},"publishedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"publishedVersion":{"type":"integer","description":"发布版本","minimum":1},"updatedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["videoId","ownerId","title","state","publishedVersion"]}
  - name: "PublishCommand"
    description: {zh: "发布命令", en: "Publish command"}
    schema: {"type":"object","additionalProperties":false,"description":"只有本模块可改发布状态，其他模块必须调用此命令","properties":{"videoId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"operatorId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"action":{"type":"string","enum":["publish","update_metadata","take_down","restore","schedule","block_copyright"],"description":"动作"},"expectedVersion":{"type":"integer","description":"期望版本（乐观锁）","minimum":1},"reason":{"type":"string","description":"原因（下架/拦截必填）"},"publishAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.core.idempotency:IdempotencyKey"}},"required":["videoId","operatorId","action","expectedVersion","idempotencyKey"]}
  - name: "CatalogVideoPage"
    description: {zh: "目录分页", en: "Catalog page"}
    schema: {"type":"object","additionalProperties":false,"properties":{"items":{"type":"array","description":"视频条目","items":{"$ref":"urn:normify:bili.publish.catalog:CatalogVideo"}},"page":{"$ref":"urn:normify:bili.contract.core.paging:PageMeta"}},"required":["items","page"]}
  - name: "VideoPublishedPayload"
    description: {zh: "发布事件载荷", en: "Video published payload"}
    schema: {"type":"object","additionalProperties":false,"description":"publish.video.published 载荷：搜索/推荐/动态/空间统计各自消费","properties":{"videoId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"ownerId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"publishedVersion":{"type":"integer","description":"发布版本","minimum":1},"partitionId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"tags":{"type":"array","description":"标签","items":{"type":"string","description":"标签"}},"visibleAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"indexFields":{"type":"object","additionalProperties":false,"description":"投影到搜索索引的最小字段集","properties":{"title":{"type":"string","description":"标题"},"ownerNickname":{"type":"string","description":"UP 主昵称"},"durationMs":{"type":"integer","description":"时长","minimum":0}},"required":["title"]}},"required":["videoId","publishedVersion","visibleAt"]}
deps:
  - kind: reference
    to: bili.contract.media.asset
    from_api: "POST /api/v1/catalog/videos/{videoId}/commands"
    label: {zh: "发布前必须存在可用媒体产物", en: "Requires ready media assets"}
  - kind: event
    to: bili.contract.core.events
    from_api: "POST /api/v1/catalog/videos/{videoId}/commands"
    label: {zh: "发布事件信封与版本", en: "Publish event envelope"}
  - kind: dataflow
    to: bili.data.projections
    label: {zh: "搜索/动态投影消费本模块事件", en: "Projections consume publish ev"}
  - kind: call
    to: bili.infra.observability
    label: {zh: "发布与下架审计留痕", en: "Audit publish and takedown"}
---
