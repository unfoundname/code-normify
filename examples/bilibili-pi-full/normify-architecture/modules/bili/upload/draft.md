---
uid: dd2e6f3c
id: bili.upload.draft
parent: bili.upload
state: planned
tags: [planned, "worker:W-CONTENT", leaf]
name: {zh: "稿件草稿", en: "Video drafts"}
description:
  zh: >
      草稿增删改查、自动保存、分步校验与提交发布
  en: >
      Draft CRUD, autosave, step validation and publish submission
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/upload/draft/src/draft.ts"
  - path: "services/upload/draft/src/autosave.ts"
  - path: "services/upload/draft/tests/draft.test.ts"
  - path: "services/upload/draft/tests/autosave.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/upload/drafts"
    description:
      zh: >
          创建稿件草稿
      en: >
          Create a video draft
    input: {module: "bili.upload.draft", name: "CreateVideoDraftRequest"}
    output: {module: "bili.upload.draft", name: "VideoDraftView"}
  - protocol: http
    method: PUT
    path: "/api/v1/upload/drafts/"
    description:
      zh: >
          保存草稿
      en: >
          Save a draft
    input: {module: "bili.upload.draft", name: "VideoDraftRequest"}
    output: {module: "bili.upload.draft", name: "VideoDraftView"}
  - protocol: http
    method: GET
    path: "/api/v1/upload/drafts/"
    description:
      zh: >
          草稿列表
      en: >
          List drafts
    output: {module: "bili.upload.draft", name: "DraftPage"}
types:
  - name: "VideoDraftView"
    description: {zh: "稿件草稿视图", en: "Video draft view"}
    schema: {"type":"object","description":"稿件草稿视图 / Video draft view","additionalProperties":false,"properties":{"draftId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 draftId（语义见对应领域契约） / Field draftId"},"title":{"type":"string","minLength":1,"description":"标题 / Title"},"coverAssetId":{"$ref":"urn:normify:bili.contract.common:Id","description":"封面媒体资源 ID / Cover media asset id"},"partitionId":{"$ref":"urn:normify:bili.contract.common:Id","description":"分区 ID / Partition id"},"tagIds":{"type":"array","items":{"$ref":"urn:normify:bili.contract.common:Id"},"description":"标签 ID 列表 / Tag id list"},"mediaState":{"$ref":"urn:normify:bili.contract.state:MediaProcessState","description":"媒体处理状态 / Media processing state"},"publishState":{"$ref":"urn:normify:bili.contract.state:PublishState","description":"发布状态 / Publish state"},"updatedAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"更新时间 / Updated time"}},"required":["draftId","title","tagIds","mediaState","publishState","updatedAt"]}
  - name: "CreateVideoDraftRequest"
    description: {zh: "创建草稿请求", en: "Create draft request"}
    schema: {"type":"object","description":"创建草稿请求 / Create draft request","additionalProperties":false,"properties":{"title":{"type":"string","minLength":1,"description":"标题 / Title"},"partitionId":{"$ref":"urn:normify:bili.contract.common:Id","description":"分区 ID / Partition id"},"tagIds":{"type":"array","items":{"$ref":"urn:normify:bili.contract.common:Id"},"description":"标签 ID 列表 / Tag id list"},"visibility":{"$ref":"urn:normify:bili.contract.common:Visibility","description":"可见性 / Visibility"},"coauthorMids":{"type":"array","items":{"type":"string","minLength":1},"description":"字段 coauthorMids（语义见对应领域契约） / Field coauthorMids"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["title","partitionId","tagIds","visibility","idempotencyKey","requestContext"]}
  - name: "DraftPage"
    description: {zh: "领域分页响应", en: "Domain page response"}
    schema: {"type":"object","additionalProperties":false,"description":"领域分页响应 / Domain page response｜与 PageResult 完全相同的分页封套字段（items/total/nextCursor/hasMore），items 使用该领域具名条目契约 / Same envelope fields as PageResult with domain-specific typed items","properties":{"items":{"type":"array","items":{"$ref":"urn:normify:bili.upload.draft:VideoDraftView"},"description":"领域条目列表 / Domain item list"},"total":{"type":"integer","minimum":0,"description":"总条数 / Total count"},"nextCursor":{"type":"string","description":"下一页游标 / Next page cursor"},"hasMore":{"type":"boolean","description":"是否还有下一页 / Whether more pages exist"}},"required":["items","hasMore"]}
  - name: "VideoDraftRequest"
    description: {zh: "稿件草稿视图写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定）", en: "Video draft view write request carrying only client-provided fields"}
    schema: {"type":"object","description":"稿件草稿视图写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定） / Video draft view write request carrying only client-provided fields","additionalProperties":false,"properties":{"draftId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 draftId（语义见对应领域契约） / Field draftId"},"title":{"type":"string","minLength":1,"description":"标题 / Title"},"coverAssetId":{"$ref":"urn:normify:bili.contract.common:Id","description":"封面媒体资源 ID / Cover media asset id"},"partitionId":{"$ref":"urn:normify:bili.contract.common:Id","description":"分区 ID / Partition id"},"tagIds":{"type":"array","items":{"$ref":"urn:normify:bili.contract.common:Id"},"description":"标签 ID 列表 / Tag id list"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["draftId","title","tagIds","idempotencyKey","requestContext"]}
deps:
  - kind: call
    to: bili.upload.part
    label: {zh: "分P顺序与媒体绑定", en: "Parts, ordering and media"}
  - kind: call
    to: bili.catalog.video
    from_api: "POST /api/v1/upload/drafts"
    to_api: "POST /api/v1/catalog/videos"
    label: {zh: "提交唯一发布命令", en: "Submit the sole publish"}
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
