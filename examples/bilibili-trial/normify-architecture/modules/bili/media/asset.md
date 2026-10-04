---
uid: 203eefdb
id: bili.media.asset
parent: bili.media
state: planned
tags: ["worker:med-asset"]
name: {zh: "媒体资产登记", en: "Media Asset Registry"}
description:
  zh: >
      OSS 原件元数据登记、校验和验证、生命周期与归属；视频二进制永不写入 RDS。
      
  en: >
      Original object metadata, checksum verification, lifecycle and ownership; binaries never in RDS.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/media/asset/src/service.ts"
  - path: "services/media/asset/migrations/0001_asset.sql"
  - path: "services/media/asset/tests/asset.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/media/assets"
    description:
      zh: >
          登记媒体原件
          
      en: >
          Register media asset
          
    input: {module: "bili.media.asset", name: "AssetRegistrationRequest"}
    output: {module: "bili.contract.media.asset", name: "MediaAsset"}
  - protocol: http
    method: GET
    path: "/api/v1/media/assets/{id}"
    description:
      zh: >
          读取资产元数据
          
      en: >
          Get asset
          
    output: {module: "bili.contract.media.asset", name: "MediaAsset"}
  - protocol: http
    method: POST
    path: "/api/v1/media/assets/{id}/verify"
    description:
      zh: >
          校验对象一致性
          
      en: >
          Verify object
          
    output: {module: "bili.media.asset", name: "AssetVerification"}
  - protocol: mysql
    path: "media_asset"
    description:
      zh: >
          媒体资产表（唯一写入所有者：媒体资产服务）
          
      en: >
          media_asset table
          
types:
  - name: "AssetRegistrationRequest"
    description: {zh: "原件登记请求", en: "Asset registration"}
    schema: {"type":"object","additionalProperties":false,"properties":{"videoId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"ownerId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"kind":{"$ref":"urn:normify:bili.contract.media.asset:MediaKind"},"ossBucket":{"type":"string","description":"bucket 逻辑名"},"ossKey":{"type":"string","description":"对象键"},"sizeBytes":{"type":"integer","description":"字节数","minimum":0},"checksumSha256":{"type":"string","description":"SHA-256","pattern":"^[a-f0-9]{64}$"},"sourceId":{"type":"string","description":"内容获取来源 id（导入时）"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.core.idempotency:IdempotencyKey"}},"required":["kind","ossBucket","ossKey","sizeBytes","checksumSha256","idempotencyKey"]}
  - name: "AssetVerification"
    description: {zh: "校验结果", en: "Asset verification"}
    schema: {"type":"object","additionalProperties":false,"properties":{"assetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"checksumMatches":{"type":"boolean","description":"校验和是否一致"},"sizeMatches":{"type":"boolean","description":"大小是否一致"},"verifiedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"failureReason":{"type":"string","description":"失败原因"}},"required":["assetId","checksumMatches","sizeMatches","verifiedAt"]}
  - name: "AssetLifecycleRule"
    description: {zh: "资产生命周期规则", en: "Asset lifecycle rule"}
    schema: {"type":"object","additionalProperties":false,"properties":{"purpose":{"type":"string","description":"对象用途"},"retainDays":{"type":"integer","description":"保留天数","minimum":0},"archiveAfterDays":{"type":"integer","description":"转归档天数","minimum":0},"deleteOnVideoDelete":{"type":"boolean","description":"视频删除时是否级联删除"},"legalHold":{"type":"boolean","description":"是否法律保留"}},"required":["purpose","retainDays","deleteOnVideoDelete"]}
deps:
  - kind: call
    to: bili.contract.adapters.oss
    label: {zh: "获取对象元数据与签名地址", en: "Head object and sign url"}
  - kind: event
    to: bili.contract.core.events
    from_api: "POST /api/v1/media/assets"
    label: {zh: "登记完成事件触发探测", en: "Registered event triggers prob"}
  - kind: dataflow
    to: bili.data.projections
    label: {zh: "OSS 对象键规范来自数据契", en: "Object key contract"}
---
