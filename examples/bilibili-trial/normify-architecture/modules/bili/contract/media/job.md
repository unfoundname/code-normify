---
uid: 276b4db6
id: bili.contract.media.job
parent: bili.contract.media
state: planned
tags: ["worker:contract-media"]
name: {zh: "媒体任务契约", en: "Media Job Contract"}
description:
  zh: >
      媒体处理任务与租约、转码档位规格，对应处理/审核/发布三状态机中的处理侧。
      
  en: >
      Media job, lease and rendition specification contract.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "packages/contracts/src/media/job.ts"
apis: []
types:
  - name: "MediaJob"
    description: {zh: "媒体处理任务", en: "Media job"}
    schema: {"type":"object","additionalProperties":false,"description":"租约到期自动重排，达到 maxAttempts 进死信","properties":{"jobId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"videoId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"assetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"jobType":{"type":"string","enum":["probe","transcode","thumbnail","preview_storyboard","audio_extract","subtitle_parse","hls_package"],"description":"任务类型"},"state":{"type":"string","enum":["queued","leased","running","succeeded","failed","dead","cancelled"],"description":"任务状态"},"leaseOwner":{"type":"string","description":"持租约的 Worker 实例"},"leaseExpiresAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"attempts":{"type":"integer","description":"已尝试次数","minimum":0},"maxAttempts":{"type":"integer","description":"最大尝试次数","minimum":1},"progressPercent":{"type":"integer","description":"进度百分比","minimum":0,"maximum":100},"outputs":{"type":"array","description":"产物","items":{"type":"object","additionalProperties":false,"properties":{"kind":{"$ref":"urn:normify:bili.contract.media.asset:MediaKind"},"ossKey":{"type":"string","description":"产物对象键"},"renditionId":{"type":"string","description":"档位 id"}},"required":["kind","ossKey"]}},"lastError":{"type":"string","description":"最后错误"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.core.idempotency:IdempotencyKey"}},"required":["jobId","videoId","assetId","jobType","state","attempts","maxAttempts"]}
  - name: "RenditionSpec"
    description: {zh: "转码档位规格", en: "Rendition spec"}
    schema: {"type":"object","additionalProperties":false,"properties":{"renditionId":{"type":"string","description":"档位 id"},"quality":{"type":"string","enum":["360p","480p","720p","1080p","1080p60","1440p","4k"],"description":"清晰度档位"},"videoCodec":{"type":"string","enum":["h264","hevc","av1"],"description":"视频编码"},"audioCodec":{"type":"string","enum":["aac","opus"],"description":"音频编码"},"bitrateKbps":{"type":"integer","description":"视频码率","minimum":100},"width":{"type":"integer","description":"宽","minimum":16},"height":{"type":"integer","description":"高","minimum":16},"frameRate":{"type":"integer","description":"帧率","minimum":1},"packageFormat":{"type":"string","enum":["hls","dash","mp4"],"description":"封装"}},"required":["renditionId","quality","videoCodec","bitrateKbps","packageFormat"]}
deps:
  - kind: reference
    to: bili.contract.media.asset
    label: {zh: "任务引用媒体资产", en: "Jobs reference media assets"}
---
