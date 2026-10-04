---
uid: "51982108"
id: bili.discovery.home
parent: bili.discovery
state: planned
tags: ["worker:disc-home"]
name: {zh: "首页与分区", en: "Home and Partitions"}
description:
  zh: >
      首页多区段装配（轮播/网格/榜单/直播入口）、分区树、分区信息流与曝光位管理。
      
  en: >
      Home section assembly, partition tree, partition feeds and exposure slots.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/discovery/home/src/feed.ts"
  - path: "services/discovery/home/src/partition.ts"
  - path: "services/discovery/home/migrations/0001_partition.sql"
  - path: "services/discovery/home/tests/feed.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/discovery/home"
    description:
      zh: >
          读取首页区段
          
      en: >
          Get home sections
          
    output: {module: "bili.discovery.home", name: "HomeFeedSection"}
  - protocol: http
    method: GET
    path: "/api/v1/partitions"
    description:
      zh: >
          读取分区树
          
      en: >
          Get partition tree
          
    output: {module: "bili.discovery.home", name: "PartitionRecord"}
  - protocol: http
    method: GET
    path: "/api/v1/discovery/partitions/{id}/feed"
    description:
      zh: >
          读取分区信息流
          
      en: >
          Get partition feed
          
    input: {module: "bili.contract.core.paging", name: "PageRequest"}
    output: {module: "bili.discovery.home", name: "HomeFeedSection"}
  - protocol: mysql
    path: "partition"
    description:
      zh: >
          分区表（唯一写入所有者：首页服务）
          
      en: >
          partition table
          
types:
  - name: "FeedCard"
    description: {zh: "内容卡片", en: "Feed card"}
    schema: {"type":"object","additionalProperties":false,"description":"卡片为跨域只读装配，不复制对方权威字段","properties":{"cardId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"targetType":{"type":"string","enum":["video","live","article","season","course","audio","dynamic","manga"],"description":"目标类型"},"targetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"title":{"type":"string","description":"标题","maxLength":120},"coverAssetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"ownerId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"durationMs":{"type":"integer","description":"时长毫秒","minimum":0},"badge":{"type":"string","description":"角标文案"},"reasonCode":{"type":"string","enum":["followed","hot","new_upload","continue_watch","same_partition","trending","subscribed"],"description":"推荐理由"},"score":{"type":"integer","description":"排序分 ×1000","minimum":0}},"required":["cardId","targetType","targetId","title","reasonCode"]}
  - name: "HomeFeedSection"
    description: {zh: "首页区段", en: "Home section"}
    schema: {"type":"object","additionalProperties":false,"properties":{"sectionId":{"type":"string","description":"区段 id"},"title":{"type":"string","description":"区段标题"},"type":{"type":"string","enum":["banner","carousel","grid","list","rank_list","live_entry"],"description":"展示形态"},"cards":{"type":"array","description":"卡片","items":{"$ref":"urn:normify:bili.discovery.home:FeedCard"}},"moreLink":{"type":"string","description":"更多跳转"},"pageSize":{"type":"integer","description":"区段容量","minimum":1,"maximum":50}},"required":["sectionId","title","type","cards"]}
  - name: "PartitionRecord"
    description: {zh: "分区", en: "Partition"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 partition，唯一约束 parent_id+name；合并后旧 id 保留映射","properties":{"partitionId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"name":{"type":"string","description":"分区名","maxLength":30},"parentId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"orderIndex":{"type":"integer","description":"排序序号","minimum":0},"iconAssetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"state":{"type":"string","enum":["active","hidden","merged"],"description":"状态"},"mergedIntoId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"}},"required":["partitionId","name","orderIndex","state"]}
deps:
  - kind: call
    to: bili.discovery.search
    from_api: "GET /api/v1/discovery/partitions/{id}/feed"
    to_api: "GET /api/v1/search"
    label: {zh: "按查询检索分区内容", en: "Search within partition"}
  - kind: call
    to: bili.discovery.ranking
    label: {zh: "嵌入榜单区段", en: "Embed ranking sections"}
  - kind: call
    to: bili.social.follow
    label: {zh: "关注流区段", en: "Following section"}
  - kind: call
    to: bili.discovery.behavior
    label: {zh: "曝光与点击反馈回流", en: "Exposure feedback"}
  - kind: call
    to: bili.infra.cache
    label: {zh: "首页区段缓存", en: "Home section cache"}
  - kind: call
    to: bili.ops.curation
    to_api: "GET /api/v1/ops/recommend-slots"
    label: {zh: "读取人工推荐位", en: "Read manual slots"}
---
