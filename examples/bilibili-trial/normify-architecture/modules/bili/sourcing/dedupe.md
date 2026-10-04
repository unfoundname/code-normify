---
uid: 247e92f2
id: bili.sourcing.dedupe
parent: bili.sourcing
state: planned
tags: ["worker:src-dedupe"]
name: {zh: "去重与指纹", en: "Dedupe and Fingerprints"}
description:
  zh: >
      内容指纹（整文件哈希/视频感知/音频色度）与重复判定、疑似重复人工裁定、避免重复入库。
      
  en: >
      Content fingerprints (whole-file hash, perceptual video, audio chroma), duplicate verdicts and manual review.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/sourcing/dedupe/src/fingerprint.ts"
  - path: "services/sourcing/dedupe/src/match.ts"
  - path: "services/sourcing/dedupe/migrations/0001_dedupe.sql"
  - path: "services/sourcing/dedupe/tests/dedupe.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/sourcing/fingerprints"
    description:
      zh: >
          登记内容指纹
          
      en: >
          Register fingerprint
          
    input: {module: "bili.sourcing.dedupe", name: "ContentFingerprint"}
    output: {module: "bili.sourcing.dedupe", name: "ContentFingerprint"}
  - protocol: http
    method: POST
    path: "/internal/sourcing/dedupe-check"
    description:
      zh: >
          查询是否重复
          
      en: >
          Dedupe check
          
    input: {module: "bili.sourcing.dedupe", name: "ContentFingerprint"}
    output: {module: "bili.sourcing.dedupe", name: "DuplicateMatch"}
  - protocol: http
    method: GET
    path: "/api/v1/sourcing/duplicates"
    description:
      zh: >
          重复判定列表
          
      en: >
          List duplicate matches
          
    input: {module: "bili.contract.core.paging", name: "PageRequest"}
    output: {module: "bili.sourcing.dedupe", name: "DuplicateMatch"}
  - protocol: mysql
    path: "content_fingerprint"
    description:
      zh: >
          内容指纹表（唯一写入所有者：去重服务）
          
      en: >
          content_fingerprint table
          
types:
  - name: "ContentFingerprint"
    description: {zh: "内容指纹", en: "Content fingerprint"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 content_fingerprint，唯一约束 algorithm+value","properties":{"fingerprintId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"algorithm":{"type":"string","enum":["sha256","perceptual_video","audio_chroma","frame_phash"],"description":"算法"},"value":{"type":"string","description":"指纹值"},"assetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"durationMs":{"type":"integer","description":"时长毫秒","minimum":0},"sizeBytes":{"type":"integer","description":"字节数","minimum":0},"createdAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["fingerprintId","algorithm","value","assetId","createdAt"]}
  - name: "DuplicateMatch"
    description: {zh: "重复判定", en: "Duplicate match"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 duplicate_match；判为 derivative 时必须保留溯源链","properties":{"matchId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"candidateFingerprintId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"existingAssetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"similarityBps":{"type":"integer","description":"相似度（基点）","minimum":0,"maximum":10000},"verdict":{"type":"string","enum":["duplicate","likely_duplicate","derivative","distinct"],"description":"结论"},"autoDecided":{"type":"boolean","description":"是否自动判定"},"decidedBy":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"decidedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"note":{"type":"string","description":"说明"}},"required":["matchId","candidateFingerprintId","existingAssetId","similarityBps","verdict"]}
deps:
  - kind: call
    to: bili.media.asset
    label: {zh: "指纹绑定媒体资产", en: "Fingerprints bind assets"}
  - kind: call
    to: bili.infra.observability
    label: {zh: "重复判定审计", en: "Audit dedupe verdicts"}
---
