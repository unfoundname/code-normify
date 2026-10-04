---
uid: 92ea9e3c
id: data.creator.t-dfe57b7a
parent: data.creator
state: planned
tags: ["worker:cre-analytics", "projection:data-contract"]
name: {zh: "AudienceProfile", en: "AudienceProfile"}
description:
  zh: >
      观众画像
  en: >
      Audience profile
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/creator/t-dfe57b7a.json"
apis: []
types:
  - name: "AudienceProfile"
    description: {zh: "观众画像", en: "Audience profile"}
    schema: {"type":"object","additionalProperties":false,"description":"小样本不输出画像，避免反推个人数据","properties":{"ownerId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"periodDays":{"type":"integer","description":"统计天数","minimum":1},"ageBuckets":{"type":"array","description":"年龄段分布","items":{"type":"object","additionalProperties":false,"properties":{"bucket":{"type":"string","description":"区间"},"ratioBps":{"type":"integer","description":"占比（基点）","minimum":0,"maximum":10000}},"required":["bucket","ratioBps"]}},"genderBuckets":{"type":"array","description":"性别分布","items":{"type":"object","additionalProperties":false,"properties":{"bucket":{"type":"string","description":"性别"},"ratioBps":{"type":"integer","description":"占比（基点）","minimum":0,"maximum":10000}},"required":["bucket","ratioBps"]}},"regionBuckets":{"type":"array","description":"地域分布","items":{"type":"object","additionalProperties":false,"properties":{"bucket":{"type":"string","description":"地域"},"ratioBps":{"type":"integer","description":"占比（基点）","minimum":0,"maximum":10000}},"required":["bucket","ratioBps"]}},"activeHours":{"type":"array","description":"活跃时段","items":{"type":"integer","description":"小时 0-23","minimum":0,"maximum":23}},"minSampleSize":{"type":"integer","description":"最小样本量（低于则不出报告）","minimum":0}},"required":["ownerId","periodDays","minSampleSize"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
---
