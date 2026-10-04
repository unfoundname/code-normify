---
uid: 30fa07ee
id: data.media.t-dde877c8
parent: data.media
state: planned
tags: ["worker:med-processing", "projection:data-contract"]
name: {zh: "RenditionOutput", en: "RenditionOutput"}
description:
  zh: >
      档位产物
  en: >
      Rendition output
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/media/t-dde877c8.json"
apis: []
types:
  - name: "RenditionOutput"
    description: {zh: "档位产物", en: "Rendition output"}
    schema: {"type":"object","additionalProperties":false,"description":"产物只存 OSS，RDS 只存引用","properties":{"renditionId":{"type":"string","description":"档位 id"},"quality":{"type":"string","description":"清晰度"},"ossKey":{"type":"string","description":"产物对象键"},"packageFormat":{"type":"string","enum":["hls","dash","mp4"],"description":"封装"},"sizeBytes":{"type":"integer","description":"字节数","minimum":0},"bitrateKbps":{"type":"integer","description":"实际码率","minimum":0},"durationMs":{"type":"integer","description":"时长毫秒","minimum":0},"checksumSha256":{"type":"string","description":"SHA-256"}},"required":["renditionId","quality","ossKey","packageFormat","sizeBytes"]}
---
