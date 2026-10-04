---
uid: 18cc35c4
id: bili.catalog.video
parent: bili.catalog
state: planned
tags: [planned, "worker:W-CONTENT", leaf]
name: {zh: "视频目录与唯一发布命令", en: "Video catalog and the sole publish command"}
description:
  zh: >
      Video 实体与全站唯一发布入口：可见性、分区、合集与封面归属
  en: >
      The Video entity and the only publish entry: visibility, taxonomy, collections and covers
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/catalog/video/src/video.ts"
  - path: "services/catalog/video/src/publish-command.ts"
  - path: "services/catalog/video/tests/video.test.ts"
  - path: "services/catalog/video/tests/publish-command.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/catalog/videos"
    description:
      zh: >
          唯一发布命令
      en: >
          The sole publish command
    input: {module: "bili.catalog.video", name: "PublishVideoRequest"}
    output: {module: "bili.catalog.video", name: "VideoView"}
  - protocol: http
    method: POST
    path: "/api/v1/catalog/audit-decisions"
    description:
      zh: >
          提交审核结论
      en: >
          Submit an audit decision
    input: {module: "bili.catalog.video", name: "AuditDecisionRequest"}
    output: {module: "bili.catalog.video", name: "VideoView"}
  - protocol: http
    method: GET
    path: "/api/v1/catalog/videos/:bvid"
    description:
      zh: >
          按 BV 号查询视频详情与发布状态（播放授权核对可见性时调用）
      en: >
          Get video detail and publish state by BV id (used by playback grant)
    input: {module: "bili.catalog.video", name: "VideoDetailQueryRequest"}
    output: {module: "bili.catalog.video", name: "VideoView"}
types:
  - name: "VideoView"
    description: {zh: "视频视图", en: "Video view"}
    schema: {"type":"object","description":"视频视图 / Video view","additionalProperties":false,"properties":{"bvid":{"type":"string","minLength":1,"description":"视频业务号（BV 号） / Video business id"},"title":{"type":"string","minLength":1,"description":"标题 / Title"},"coverAssetId":{"$ref":"urn:normify:bili.contract.common:Id","description":"封面媒体资源 ID / Cover media asset id"},"durationMs":{"type":"integer","description":"时长（毫秒） / Duration in ms"},"uploaderId":{"$ref":"urn:normify:bili.contract.common:Id","description":"投稿用户 ID / Uploader user id"},"partitionId":{"$ref":"urn:normify:bili.contract.common:Id","description":"分区 ID / Partition id"},"tagIds":{"type":"array","items":{"$ref":"urn:normify:bili.contract.common:Id"},"description":"标签 ID 列表 / Tag id list"},"visibility":{"$ref":"urn:normify:bili.contract.common:Visibility","description":"可见性 / Visibility"},"publishState":{"$ref":"urn:normify:bili.contract.state:PublishState","description":"发布状态 / Publish state"},"auditState":{"$ref":"urn:normify:bili.contract.state:AuditState","description":"审核状态 / Audit state"},"publishedAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"发布时间 / Published time"}},"required":["bvid","title","coverAssetId","durationMs","uploaderId","partitionId","tagIds","visibility","publishState","auditState"]}
  - name: "PublishVideoRequest"
    description: {zh: "发布命令请求", en: "Publish command request"}
    schema: {"type":"object","description":"发布命令请求 / Publish command request","additionalProperties":false,"properties":{"draftId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 draftId（语义见对应领域契约） / Field draftId"},"title":{"type":"string","minLength":1,"description":"标题 / Title"},"coverAssetId":{"$ref":"urn:normify:bili.contract.common:Id","description":"封面媒体资源 ID / Cover media asset id"},"partitionId":{"$ref":"urn:normify:bili.contract.common:Id","description":"分区 ID / Partition id"},"tagIds":{"type":"array","items":{"$ref":"urn:normify:bili.contract.common:Id"},"description":"标签 ID 列表 / Tag id list"},"partAssetIds":{"type":"array","items":{"$ref":"urn:normify:bili.contract.common:Id"},"description":"字段 partAssetIds（语义见对应领域契约） / Field partAssetIds"},"visibility":{"$ref":"urn:normify:bili.contract.common:Visibility","description":"可见性 / Visibility"},"publishedAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"发布时间 / Published time"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["draftId","title","coverAssetId","partitionId","tagIds","partAssetIds","visibility","idempotencyKey","requestContext"]}
  - name: "AuditDecisionRequest"
    description: {zh: "审核结论请求", en: "Audit decision request"}
    schema: {"type":"object","description":"审核结论请求 / Audit decision request","additionalProperties":false,"properties":{"bvid":{"type":"string","minLength":1,"description":"视频业务号（BV 号） / Video business id"},"policyId":{"type":"string","minLength":1,"description":"字段 policyId（语义见对应领域契约） / Field policyId"},"reason":{"type":"string","minLength":1,"description":"原因或理由 / Reason"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["bvid","policyId","idempotencyKey","requestContext"]}
  - name: "VideoDetailQueryRequest"
    description: {zh: "视频详情查询请求", en: "Video detail query request"}
    schema: {"type":"object","description":"视频详情查询请求 / Video detail query request","additionalProperties":false,"properties":{"bvid":{"type":"string","minLength":1,"description":"视频业务号（BV 号） / Video business id"}},"required":["bvid"]}
deps:
  - kind: call
    to: bili.media.state
    label: {zh: "要求媒体处理完成", en: "Require finished media"}
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
