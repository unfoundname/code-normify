---
uid: 4ef23b0f
id: bili.media.artwork
parent: bili.media
state: planned
tags: ["worker:med-artwork"]
name: {zh: "封面与字幕", en: "Artwork and Subtitles"}
description:
  zh: >
      封面候选（截图/自传）、字幕轨（上传/自动 ASR/社区字幕）与字幕审核状态、语言与格式管理。
      
  en: >
      Cover candidates and subtitle tracks from upload, ASR or community with review state per track.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/media/artwork/src/cover.ts"
  - path: "services/media/artwork/src/subtitle.ts"
  - path: "services/media/artwork/migrations/0001_artwork.sql"
  - path: "services/media/artwork/tests/artwork.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/media/covers"
    description:
      zh: >
          登记封面候选
          
      en: >
          Register cover candidate
          
    input: {module: "bili.media.artwork", name: "CoverCandidate"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: POST
    path: "/api/v1/media/subtitles"
    description:
      zh: >
          登记字幕轨
          
      en: >
          Register subtitle track
          
    input: {module: "bili.media.artwork", name: "SubtitleTrack"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: GET
    path: "/api/v1/media/videos/{videoId}/subtitle-tracks"
    description:
      zh: >
          列出已通过字幕轨
          
      en: >
          List approved subtitle tracks
          
    output: {module: "bili.media.artwork", name: "SubtitleTrack"}
  - protocol: mysql
    path: "subtitle_track"
    description:
      zh: >
          字幕轨表（唯一写入所有者：封面字幕服务）
          
      en: >
          subtitle_track table
          
types:
  - name: "CoverCandidate"
    description: {zh: "封面候选", en: "Cover candidate"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 cover_candidate","properties":{"candidateId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"videoId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"assetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"source":{"type":"string","enum":["auto_frame","owner_upload","template"],"description":"来源"},"width":{"type":"integer","description":"宽","minimum":16},"height":{"type":"integer","description":"高","minimum":16},"selected":{"type":"boolean","description":"是否被选为正式封面"},"createdAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["candidateId","videoId","assetId","source","selected"]}
  - name: "SubtitleTrack"
    description: {zh: "字幕轨", en: "Subtitle track"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 subtitle_track，唯一约束 video_id+lang+origin","properties":{"trackId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"videoId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"lang":{"type":"string","description":"语言 BCP-47，如 zh-CN"},"format":{"type":"string","enum":["srt","ass","vtt"],"description":"格式"},"assetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"origin":{"type":"string","enum":["owner_upload","auto_asr","community","official"],"description":"来源"},"reviewState":{"type":"string","enum":["pending","approved","rejected"],"description":"字幕审核状态"},"contributorId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"createdAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["trackId","videoId","lang","format","assetId","reviewState"]}
deps:
  - kind: call
    to: bili.media.asset
    label: {zh: "封面与字幕后端仍存 OSS ", en: "Assets stored on OSS"}
  - kind: call
    to: bili.media.processing
    label: {zh: "从转码产物抽取帧与音轨", en: "Extract frames and audio"}
  - kind: event
    to: bili.contract.core.events
    label: {zh: "字幕审核事件", en: "Subtitle review events"}
---
