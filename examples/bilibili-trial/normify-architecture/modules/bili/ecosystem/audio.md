---
uid: c4941661
id: bili.ecosystem.audio
parent: bili.ecosystem
state: planned
tags: ["worker:eco-audio"]
name: {zh: "音频", en: "Audio"}
description:
  zh: >
      音频投稿与专辑、音质档位、播放与后台播放、授权说明与版权标注、音频分类。
      
  en: >
      Audio uploads and playlists, quality profiles, playback and background play, license notes and categories.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/ecosystem/audio/src/service.ts"
  - path: "services/ecosystem/audio/migrations/0001_audio.sql"
  - path: "services/ecosystem/audio/tests/audio.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/audio"
    description:
      zh: >
          创建音频投稿
          
      en: >
          Create audio
          
    input: {module: "bili.ecosystem.audio", name: "AudioRecord"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: GET
    path: "/api/v1/audio/{id}"
    description:
      zh: >
          读取音频
          
      en: >
          Get audio
          
    output: {module: "bili.ecosystem.audio", name: "AudioRecord"}
  - protocol: http
    method: GET
    path: "/api/v1/audio/playlists/{id}"
    description:
      zh: >
          读取歌单
          
      en: >
          Get playlist
          
    output: {module: "bili.ecosystem.audio", name: "AudioPlaylist"}
  - protocol: mysql
    path: "audio"
    description:
      zh: >
          音频表（唯一写入所有者：音频服务）
          
      en: >
          audio table
          
types:
  - name: "AudioRecord"
    description: {zh: "音频", en: "Audio track"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 audio；音频原件存 OSS","properties":{"audioId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"ownerId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"title":{"type":"string","description":"标题","maxLength":80},"coverAssetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"audioAssetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"durationMs":{"type":"integer","description":"时长毫秒","minimum":0},"categoryId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"tags":{"type":"array","description":"标签","items":{"type":"string","description":"标签"}},"licenseNote":{"type":"string","description":"授权与版权说明"},"qualityProfiles":{"type":"array","description":"音质档位","items":{"type":"string","enum":["standard","high","lossless"],"description":"档位"}},"state":{"type":"string","enum":["draft","in_review","published","rejected","taken_down"],"description":"状态机"},"playCount":{"type":"integer","description":"播放量（投影）","minimum":0},"createdAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["audioId","ownerId","title","audioAssetId","state"]}
  - name: "AudioPlaylist"
    description: {zh: "音频歌单", en: "Audio playlist"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 audio_playlist，audio_playlist_item 关联表显式建模","properties":{"playlistId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"ownerId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"title":{"type":"string","description":"歌单标题","maxLength":80},"description":{"type":"string","description":"简介","maxLength":500},"audioIds":{"type":"array","description":"音频","items":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"}},"visibility":{"$ref":"urn:normify:bili.contract.core.ids:Visibility"},"itemCount":{"type":"integer","description":"条目数","minimum":0}},"required":["playlistId","ownerId","title","visibility"]}
deps:
  - kind: call
    to: bili.media.asset
    label: {zh: "音频原件登记", en: "Register audio asset"}
  - kind: call
    to: bili.media.processing
    label: {zh: "音频转码与响度归一", en: "Audio transcode"}
  - kind: call
    to: bili.ops.review
    label: {zh: "音频审核", en: "Audio review"}
  - kind: call
    to: bili.premium.entitlement
    label: {zh: "音频播放权益", en: "Audio entitlement"}
---
