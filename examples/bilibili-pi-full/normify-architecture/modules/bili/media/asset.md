---
uid: d81c8388
id: bili.media.asset
parent: bili.media
state: planned
tags: [planned, "worker:W-MEDIA", leaf]
name: {zh: "媒体资源与原件", en: "Media assets and originals"}
description:
  zh: >
      OSS 原件元数据、多版本产物索引与播放可用的唯一资源视图
  en: >
      OSS original metadata, multi-version artifact index and the single playable asset view
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/media/asset/src/asset.ts"
  - path: "services/media/asset/src/version-index.ts"
  - path: "services/media/asset/tests/asset.test.ts"
  - path: "services/media/asset/tests/version-index.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/media/assets/:assetId"
    description:
      zh: >
          按资源 ID 查询媒体资源（路径参数与类型化 input 一致）
      en: >
          Get a media asset by path parameter and typed input
    input: {module: "bili.media.asset", name: "MediaAssetQueryRequest"}
    output: {module: "bili.media.asset", name: "MediaAssetView"}
  - protocol: http
    method: GET
    path: "/api/v1/media/assets/:assetId/versions"
    description:
      zh: >
          按资源 ID 查询转码版本
      en: >
          List transcode versions of an asset by path parameter
    input: {module: "bili.media.asset", name: "MediaAssetQueryRequest"}
    output: {module: "bili.contract.common", name: "PageResult"}
  - protocol: rpc
    path: "db.table.media_asset"
    description:
      zh: >
          权威表 media_asset（唯一写入所有者：本模块）
      en: >
          Authoritative table (RDS dialect and adapter pending) (RDS dialect and adapter pending) (RDS dialect and adapter pending) (RDS dialect and adapter pending) (RDS dialect and adapter pending) (RDS
types:
  - name: "MediaAssetView"
    description: {zh: "媒体资源视图", en: "Media asset view"}
    schema: {"type":"object","description":"媒体资源视图 / Media asset view","additionalProperties":false,"properties":{"assetId":{"$ref":"urn:normify:bili.contract.common:Id","description":"媒体资源 ID / Media asset id"},"ownerId":{"$ref":"urn:normify:bili.contract.common:Id","description":"所有者用户 ID / Owner user id"},"bucket":{"type":"string","minLength":1,"description":"OSS bucket 名 / OSS bucket name"},"objectKey":{"type":"string","minLength":1,"description":"OSS 对象键 / OSS object key"},"mimeType":{"type":"string","minLength":1,"description":"MIME 类型 / Mime type"},"sizeBytes":{"type":"integer","description":"对象字节数 / Object size in bytes"},"sha256":{"type":"string","minLength":1,"description":"内容 SHA-256 / Content sha-256"},"mediaState":{"$ref":"urn:normify:bili.contract.state:MediaProcessState","description":"媒体处理状态 / Media processing state"},"durationMs":{"type":"integer","description":"时长（毫秒） / Duration in ms"}},"required":["assetId","ownerId","bucket","objectKey","mimeType","sizeBytes","sha256","mediaState"]}
  - name: "TranscodeVersion"
    description: {zh: "转码版本", en: "Transcode version"}
    schema: {"type":"object","description":"转码版本 / Transcode version","additionalProperties":false,"properties":{"versionId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 versionId（语义见对应领域契约） / Field versionId"},"assetId":{"$ref":"urn:normify:bili.contract.common:Id","description":"媒体资源 ID / Media asset id"},"qualityId":{"$ref":"urn:normify:bili.contract.common:Id","description":"清晰度档位 ID / Quality tier id"},"codec":{"type":"string","minLength":1,"description":"编码格式 / Codec"},"width":{"type":"integer","description":"宽（像素） / Width in pixels"},"height":{"type":"integer","description":"高（像素） / Height in pixels"},"bitrateBps":{"type":"integer","description":"码率（bps） / Bitrate in bps"},"objectKey":{"type":"string","minLength":1,"description":"OSS 对象键 / OSS object key"}},"required":["versionId","assetId","qualityId","codec","width","height","bitrateBps","objectKey"]}
  - name: "SubtitleTrack"
    description: {zh: "字幕轨", en: "Subtitle track"}
    schema: {"type":"object","description":"字幕轨 / Subtitle track","additionalProperties":false,"properties":{"subtitleId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字幕 ID / Subtitle id"},"assetId":{"$ref":"urn:normify:bili.contract.common:Id","description":"媒体资源 ID / Media asset id"},"language":{"type":"string","minLength":1,"description":"语言代码 / Language code"},"format":{"type":"string","enum":["ASS","SRT","VTT"],"description":"格式 / Format"},"objectKey":{"type":"string","minLength":1,"description":"OSS 对象键 / OSS object key"}},"required":["subtitleId","assetId","language","format","objectKey"]}
  - name: "AudioTrackView"
    description: {zh: "音轨视图", en: "Audio track view"}
    schema: {"type":"object","description":"音轨视图 / Audio track view","additionalProperties":false,"properties":{"audioTrackId":{"$ref":"urn:normify:bili.contract.common:Id","description":"音轨 ID / Audio track id"},"assetId":{"$ref":"urn:normify:bili.contract.common:Id","description":"媒体资源 ID / Media asset id"},"language":{"type":"string","minLength":1,"description":"语言代码 / Language code"},"codec":{"type":"string","minLength":1,"description":"编码格式 / Codec"},"bitrateBps":{"type":"integer","description":"码率（bps） / Bitrate in bps"},"defaultTrack":{"type":"boolean","description":"字段 defaultTrack（语义见对应领域契约） / Field defaultTrack"}},"required":["audioTrackId","assetId","language","codec","bitrateBps","defaultTrack"]}
  - name: "MediaAssetQueryRequest"
    description: {zh: "媒体资源查询请求", en: "Media asset query request"}
    schema: {"type":"object","description":"媒体资源查询请求 / Media asset query request","additionalProperties":false,"properties":{"assetId":{"$ref":"urn:normify:bili.contract.common:Id","description":"媒体资源 ID / Media asset id"}},"required":["assetId"]}
deps:
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
