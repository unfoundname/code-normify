---
uid: c0b0a50b
id: data.identity.t-a2c9d46e
parent: data.identity
state: planned
tags: ["worker:id-profile", "projection:data-contract"]
name: {zh: "UserProfile", en: "UserProfile"}
description:
  zh: >
      用户资料
  en: >
      User profile
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/identity/t-a2c9d46e.json"
apis: []
types:
  - name: "UserProfile"
    description: {zh: "用户资料", en: "User profile"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 user_profile；头像只存 OSS 资产引用","properties":{"userId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"nickname":{"type":"string","description":"昵称","minLength":1,"maxLength":24},"avatarAssetId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"bannerAssetId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"signature":{"type":"string","description":"个性签名","maxLength":120},"gender":{"type":"string","enum":["unknown","male","female","other"],"description":"性别"},"birthdayMonth":{"type":"integer","description":"生日月份（仅月日，不存年份）","minimum":1,"maximum":12},"level":{"type":"integer","description":"等级","minimum":0,"maximum":6},"experience":{"type":"integer","description":"经验值","minimum":0},"verified":{"type":"boolean","description":"是否已实名"},"updatedAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"}},"required":["userId","nickname","level","experience"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-7a625dbd
    label: {zh: "类型引用", en: "Type reference"}
---
