---
uid: a9d872d7
id: bili.contract.common
parent: bili.contract
state: planned
tags: [planned, "worker:W-CONTRACT", leaf]
name: {zh: "通用契约与分页错误", en: "Common contracts, pagination and errors"}
description:
  zh: >
      字符串 ID、UTC 时间、最小货币单位整数、唯一分页与错误形态
  en: >
      String ids, UTC time, minor-unit money, the only pagination and error shapes
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "contracts/types/common.ts"
  - path: "contracts/tests/common.test.mjs"
apis:
  - protocol: file
    path: "contracts/types/common.ts"
    description:
      zh: >
          通用契约类型入口
      en: >
          Common contract type entry
types:
  - name: "Id"
    description: {zh: "统一实体标识：字符串，禁止用自增整数做外部契约", en: "Unified entity id: string, auto-increment integers are forbidden in contracts"}
    schema: {"type":"string","pattern":"^[A-Za-z0-9_-]{1,64}$","description":"全站统一字符串 ID / Unified string id"}
  - name: "ModuleId"
    description: {zh: "架构模块标识：小写点分（用于事件的生产/消费模块字段）", en: "Architecture module id: lowercase dotted, used by event producer and consumer fields"}
    schema: {"type":"string","pattern":"^[a-z0-9][a-z0-9-]*(.[a-z0-9][a-z0-9-]*)*$","description":"模块 id，如 bili.catalog.event / Module id"}
  - name: "Timestamp"
    description: {zh: "统一时间：UTC ISO 8601，必须带 Z 后缀（禁止本地偏移）", en: "Unified time: UTC ISO 8601 with a mandatory Z suffix; local offsets are rejected"}
    schema: {"type":"string","format":"date-time","pattern":"^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d{1,6})?Z$","description":"UTC ISO 8601 时间，秒级或更高精度且必须为 Z / UTC ISO 8601 instant ending in Z"}
  - name: "Money"
    description: {zh: "统一金额：最小货币单位整数 + 货币代码", en: "Unified money: integer minor units plus currency code"}
    schema: {"type":"object","additionalProperties":false,"description":"禁止浮点金额；账本与订单共用","properties":{"amount":{"type":"integer","description":"最小货币单位整数 / Amount in minor units"},"currency":{"type":"string","enum":["CNY","BCOIN","BATTERY","COIN"],"description":"货币或虚拟币代码 / Currency or virtual token code"}},"required":["amount","currency"]}
  - name: "MoneyAmount"
    description: {zh: "金额数值（最小货币单位整数）", en: "Money amount in minor units"}
    schema: {"type":"integer","minimum":0,"description":"最小货币单位整数 / Integer minor units"}
  - name: "PageRequest"
    description: {zh: "唯一分页请求形态：游标优先，pageSize 上限 100", en: "Single pagination request: cursor first, pageSize max 100"}
    schema: {"type":"object","additionalProperties":false,"description":"禁止第二种分页形态 / No second pagination shape","properties":{"cursor":{"type":"string","description":"分页游标 / Page cursor"},"pageSize":{"type":"integer","minimum":1,"maximum":100,"description":"每页条数 / Page size"},"sort":{"type":"string","enum":["latest","hot","score","custom"],"description":"排序方式 / Sort order"}}}
  - name: "ResourceSummary"
    description: {zh: "资源摘要：仅用于简单列表；需要正文/进度/价格等字段时必须使用领域条目契约", en: "Resource summary for simple lists only; use a domain item contract when body, progress or price is needed"}
    schema: {"type":"object","additionalProperties":false,"description":"简单列表条目摘要 / Item summary for simple lists","properties":{"resourceId":{"$ref":"urn:normify:bili.contract.common:Id"},"resourceType":{"type":"string","enum":["video","user","live","article","audio","manga","season","episode","course","comment","danmaku","order","goods"],"description":"资源类型 / Resource type"},"title":{"type":"string","description":"标题 / Title"},"subtitle":{"type":"string","description":"副标题 / Subtitle"},"coverUrl":{"type":"string","format":"uri","description":"封面地址 / Cover url"}},"required":["resourceId","resourceType","title"]}
  - name: "PageResult"
    description: {zh: "唯一分页响应封套（简单列表用）；需要领域字段的列表必须使用与它同字段形态的领域分页类型", en: "The single pagination envelope for simple lists; domain lists must use a domain page type with the same envelope fields"}
    schema: {"type":"object","additionalProperties":false,"description":"唯一分页响应封套 / The only pagination envelope","properties":{"items":{"type":"array","items":{"$ref":"urn:normify:bili.contract.common:ResourceSummary"},"description":"结果列表（仅摘要字段） / Result items carrying summary fields only"},"total":{"type":"integer","minimum":0,"description":"总条数 / Total count"},"nextCursor":{"type":"string","description":"下一页游标 / Next page cursor"},"hasMore":{"type":"boolean","description":"是否还有下一页 / Whether more pages exist"}},"required":["items","hasMore"]}
  - name: "ApiError"
    description: {zh: "唯一错误形态：枚举 code + 请求上下文", en: "Single error shape: enum code plus request context"}
    schema: {"type":"object","additionalProperties":false,"description":"唯一错误体 / The only error body","properties":{"code":{"type":"string","enum":["INVALID_ARGUMENT","UNAUTHENTICATED","PERMISSION_DENIED","NOT_FOUND","CONFLICT","PRECONDITION_FAILED","RATE_LIMITED","DEPENDENCY_UNAVAILABLE","INTERNAL"],"description":"错误码 / Error code"},"message":{"type":"string","description":"可展示信息 / Displayable message"},"requestId":{"type":"string","description":"请求 ID / Request id"},"details":{"type":"object","additionalProperties":true,"description":"结构化细节 / Structured details"}},"required":["code","message","requestId"]}
  - name: "IdempotencyKey"
    description: {zh: "写操作幂等键：同一业务动作重放必须返回同一结果", en: "Write idempotency key: replaying one business action must return the same result"}
    schema: {"type":"string","pattern":"^[A-Za-z0-9:_-]{8,128}$","description":"客户端生成，服务端去重存储 / Client generated, server deduplicated"}
  - name: "RequestContext"
    description: {zh: "请求上下文：所有写入口必填（网关或调用方注入）", en: "Request context, required by every write entry point and injected by the gateway or caller"}
    schema: {"type":"object","additionalProperties":false,"description":"网关注入；userId 由鉴权结果填充，不接受调用方伪造 / Injected by the gateway; userId comes from the authenticated principal","properties":{"requestId":{"type":"string","description":"请求 ID / Request id"},"userId":{"$ref":"urn:normify:bili.contract.common:Id"},"deviceId":{"type":"string","description":"设备标识 / Device id"},"appVersion":{"type":"string","description":"客户端版本 / Client app version"},"platformCode":{"type":"string","enum":["web","ios","android","harmony","tv","openapi"],"description":"平台代码 / Platform code"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey"},"traceId":{"type":"string","description":"链路追踪 ID / Trace id"}},"required":["requestId","platformCode"]}
  - name: "Visibility"
    description: {zh: "内容可见性：播放授权与目录投影共用", en: "Content visibility shared by playback grants and catalog projections"}
    schema: {"type":"string","enum":["PUBLIC","FOLLOWERS_ONLY","UNLISTED","PRIVATE","PAID_ONLY","REGION_LOCKED"],"description":"可见性 / Visibility"}
  - name: "PlayableResourceType"
    description: {zh: "可播放资源类型：统一播放授权的资源枚举（视频/剧集/课时/直播间/音频/专栏）", en: "Playable resource types for the unified playback grant (video, episode, lesson, live room, audio, article)"}
    schema: {"type":"string","enum":["VIDEO","PGC_EPISODE","COURSE_LESSON","LIVE_ROOM","AUDIO","ARTICLE"],"description":"可播放资源类型 / Playable resource type"}
  - name: "SearchDocument"
    description: {zh: "检索文档契约：存储适配器只认这个形态，业务模块负责把自己的文档映射进来", en: "Search document contract owned by the storage-side: business modules map their own documents into this shape"}
    schema: {"type":"object","additionalProperties":false,"description":"与具体领域无关的检索文档 / Domain-agnostic search document","properties":{"indexName":{"type":"string","description":"索引名 / Index name"},"documentId":{"type":"string","description":"文档 ID（通常是业务对象 id） / Document id"},"resourceType":{"type":"string","enum":["video","user","live","article","audio","manga","season","course"],"description":"资源类型 / Resource type"},"textFields":{"type":"object","additionalProperties":true,"description":"可检索文本字段（title/tags 等） / Searchable text fields"},"filterFields":{"type":"object","additionalProperties":true,"description":"精确过滤字段（分区/时长/审核状态等） / Exact filter fields"},"rankFields":{"type":"object","additionalProperties":true,"description":"排序字段（播放量/热度等） / Ranking fields"},"updatedAt":{"$ref":"urn:normify:bili.contract.common:Timestamp"}},"required":["indexName","documentId","resourceType","textFields","updatedAt"]}
  - name: "SearchQuery"
    description: {zh: "检索查询契约：适配器无关的查询形态", en: "Domain-agnostic search query contract"}
    schema: {"type":"object","additionalProperties":false,"description":"由领域检索模块构造，适配器只负责执行 / Built by domain search modules; the adapter only executes","properties":{"indexName":{"type":"string","description":"索引名 / Index name"},"queryText":{"type":"string","description":"查询文本 / Query text"},"filters":{"type":"object","additionalProperties":true,"description":"过滤条件 / Filters"},"page":{"$ref":"urn:normify:bili.contract.common:PageRequest"}},"required":["indexName"]}
---
