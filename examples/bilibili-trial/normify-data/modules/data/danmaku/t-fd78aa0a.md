---
uid: 06284f78
id: data.danmaku.t-fd78aa0a
parent: data.danmaku
state: planned
tags: ["worker:dm-stream", "projection:data-contract"]
name: {zh: "DanmakuEntry", en: "DanmakuEntry"}
description:
  zh: >
      弹幕条目
  en: >
      Danmaku entry
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/danmaku/t-fd78aa0a.json"
apis: []
types:
  - name: "DanmakuEntry"
    description: {zh: "弹幕条目", en: "Danmaku entry"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 danmaku，索引 video_id+time_ms；只读接口不返回被屏蔽弹幕","properties":{"danmakuId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"videoId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"episodeId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"authorId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"content":{"type":"string","description":"文本内容","minLength":1,"maxLength":100},"timeMs":{"type":"integer","description":"相对视频时间毫秒","minimum":0},"mode":{"type":"string","enum":["scroll","top","bottom","reverse"],"description":"模式"},"fontSize":{"type":"string","enum":["small","medium","large"],"description":"字号"},"colorHex":{"type":"string","description":"颜色 #RRGGBB","pattern":"^#[0-9a-fA-F]{6}$"},"pool":{"type":"string","enum":["normal","subtitle","special","code"],"description":"池"},"state":{"type":"string","enum":["visible","blocked","deleted","under_review"],"description":"状态"},"createdAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"}},"required":["danmakuId","videoId","timeMs","content","mode","pool","state"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-7a625dbd
    label: {zh: "类型引用", en: "Type reference"}
---
