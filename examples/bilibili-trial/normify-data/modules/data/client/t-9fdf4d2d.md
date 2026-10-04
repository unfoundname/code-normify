---
uid: 0801cf34
id: data.client.t-9fdf4d2d
parent: data.client
state: planned
tags: ["worker:web-shell", "projection:data-contract"]
name: {zh: "ThemeToken", en: "ThemeToken"}
description:
  zh: >
      主题令牌
  en: >
      Theme token
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/client/t-9fdf4d2d.json"
apis: []
types:
  - name: "ThemeToken"
    description: {zh: "主题令牌", en: "Theme token"}
    schema: {"type":"object","additionalProperties":false,"properties":{"name":{"type":"string","description":"令牌名"},"value":{"type":"string","description":"值"},"category":{"type":"string","enum":["color","spacing","radius","typography","shadow","zIndex"],"description":"类别"}},"required":["name","value","category"]}
---
