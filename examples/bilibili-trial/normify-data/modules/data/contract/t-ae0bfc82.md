---
uid: 452f5954
id: data.contract.t-ae0bfc82
parent: data.contract
state: planned
tags: ["worker:contract-adapters", "projection:data-contract"]
name: {zh: "BucketBinding", en: "BucketBinding"}
description:
  zh: >
      Bucket 绑定（待配置）
  en: >
      Bucket binding (pending)
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/contract/t-ae0bfc82.json"
apis: []
types:
  - name: "BucketBinding"
    description: {zh: "Bucket 绑定（待配置）", en: "Bucket binding (pending)"}
    schema: {"type":"object","additionalProperties":false,"description":"当前 state=planned，未访问真实 OSS","properties":{"purpose":{"type":"string","description":"逻辑用途"},"bucketName":{"type":"string","description":"bucket 名称，待用户提供"},"region":{"type":"string","description":"地域，待确认"},"endpoint":{"type":"string","description":"访问端点，待确认"},"lifecycleRule":{"type":"string","description":"生命周期规则"},"configured":{"type":"boolean","description":"是否已完成连接参数配置"}},"required":["purpose","configured"]}
---
