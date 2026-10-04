---
uid: 8726f6d1
id: bili.client.shared.player
parent: bili.client.shared
state: planned
tags: [planned, "worker:W-CONTRACT", leaf]
name: {zh: "播放器组件契约", en: "Player component contract"}
description:
  zh: >
      播放控制、清晰度/字幕/音轨切换、弹幕层挂载与快捷键
  en: >
      Playback control, quality/subtitle/audio switching, danmaku layer mounting and shortcuts
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/web/src/shared/player/index.tsx"
  - path: "apps/web/src/shared/player/danmaku-layer.tsx"
  - path: "apps/web/tests/shared/player/index.test.tsx"
  - path: "apps/web/tests/shared/player/danmaku-layer.test.tsx"
apis:
  - protocol: file
    path: "apps/web/src/shared/player/index.tsx"
    description:
      zh: >
          播放器组件入口
      en: >
          Player component entry
types:
  - name: "PlayerProps"
    description: {zh: "播放器属性", en: "Player props"}
    schema: {"type":"object","description":"播放器属性 / Player props","additionalProperties":false,"properties":{"playlist":{"$ref":"urn:normify:bili.playback.stream:StreamPlaylist","description":"字段 playlist（语义见对应领域契约） / Field playlist"},"grant":{"$ref":"urn:normify:bili.contract.state:PlaybackGrant","description":"字段 grant（语义见对应领域契约） / Field grant"},"autoplay":{"type":"boolean","description":"字段 autoplay（语义见对应领域契约） / Field autoplay"},"danmakuEnabled":{"type":"boolean","description":"字段 danmakuEnabled（语义见对应领域契约） / Field danmakuEnabled"},"initialQualityId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 initialQualityId（语义见对应领域契约） / Field initialQualityId"}},"required":["playlist","grant","autoplay","danmakuEnabled"]}
---
