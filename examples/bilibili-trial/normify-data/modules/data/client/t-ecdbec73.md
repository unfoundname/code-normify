---
uid: 17a41e2f
id: data.client.t-ecdbec73
parent: data.client
state: planned
tags: ["worker:web-playback", "projection:data-contract"]
name: {zh: "ResumeDecision", en: "ResumeDecision"}
description:
  zh: >
      续播决策
  en: >
      Resume decision
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/client/t-ecdbec73.json"
apis: []
types:
  - name: "ResumeDecision"
    description: {zh: "续播决策", en: "Resume decision"}
    schema: {"type":"object","additionalProperties":false,"properties":{"mode":{"type":"string","enum":["continue_next","resume_position","restart"],"description":"续播方式"},"positionMs":{"type":"integer","description":"起播位置毫秒","minimum":0},"reason":{"type":"string","description":"决策原因"}},"required":["mode","positionMs"]}
---
