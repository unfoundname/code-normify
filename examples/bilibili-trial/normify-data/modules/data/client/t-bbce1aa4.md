---
uid: 20274d58
id: data.client.t-bbce1aa4
parent: data.client
state: planned
tags: ["worker:web-playback", "projection:data-contract"]
name: {zh: "PlayerOptions", en: "PlayerOptions"}
description:
  zh: >
      播放器配置
  en: >
      Player options
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/client/t-bbce1aa4.json"
apis: []
types:
  - name: "PlayerOptions"
    description: {zh: "播放器配置", en: "Player options"}
    schema: {"type":"object","additionalProperties":false,"properties":{"grant":{"$ref":"urn:normify:data.contract.t-af9bc098:PlaybackGrant"},"autoplay":{"type":"boolean","description":"自动播放"},"startPositionMs":{"type":"integer","description":"起播位置毫秒","minimum":0},"quality":{"type":"string","description":"清晰度"},"subtitleLang":{"type":"string","description":"字幕语言"},"playbackRate":{"type":"integer","description":"倍速 ×100（100=1.0x）","minimum":50,"maximum":400},"danmakuEnabled":{"type":"boolean","description":"是否开启弹幕"}},"required":["grant","playbackRate"]}
deps:
  - kind: reference
    to: data.contract.t-af9bc098
    label: {zh: "类型引用", en: "Type reference"}
---
