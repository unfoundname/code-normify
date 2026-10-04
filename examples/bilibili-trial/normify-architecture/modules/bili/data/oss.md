---
uid: d152f912
id: bili.data.oss
parent: bili.data
state: planned
tags: ["worker:data-steward"]
name: {zh: "OSS 对象布局契约", en: "OSS Object Layout"}
description:
  zh: >
      bucket 用途、对象键规则、生命周期与加密；OSS 只存二进制与元数据，不把视频写进 RDS。
      
  en: >
      Bucket purposes, key patterns, lifecycle and encryption; binaries live in OSS, never in RDS.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "db/object-layout.md"
apis: []
types:
  - name: "ObjectKeyContract"
    description: {zh: "对象键契约", en: "Object key contract"}
    schema: {"type":"object","additionalProperties":false,"description":"bucket 名称与地域待用户配置","properties":{"purpose":{"type":"string","enum":["media-origin","media-transcoded","cover","subtitle","preview","live-record","live-cover","attachment","export","import-stage"],"description":"用途"},"keyPattern":{"type":"string","description":"键规则，如 origin/{ownerId}/{videoId}/{assetId}"},"contentTypes":{"type":"array","description":"允许 MIME","items":{"type":"string","description":"MIME"}},"maxSizeBytes":{"type":"integer","description":"单对象上限","minimum":1},"lifecycle":{"type":"string","enum":["hot","ia_30d","archive_180d","delete_after_90d"],"description":"生命周期"},"encryption":{"type":"string","enum":["none","sse_oss","sse_kms"],"description":"加密"}},"required":["purpose","keyPattern","lifecycle","encryption"]}
  - name: "OssObjectMetaTable"
    description: {zh: "oss_object 元数据表", en: "oss_object metadata table"}
    schema: {"type":"object","additionalProperties":false,"properties":{"table":{"type":"string","description":"表名 oss_object"},"columns":{"type":"array","description":"列","items":{"type":"string","description":"列定义"}},"uniques":{"type":"array","description":"唯一约束：bucket+purpose+key","items":{"type":"string","description":"约束"}},"note":{"type":"string","description":"仅存对象元数据与归属，不存二进制"},"ownerModule":{"type":"string","description":"写入所有者：媒体资产服务"}},"required":["table","columns","uniques","ownerModule"]}
---
