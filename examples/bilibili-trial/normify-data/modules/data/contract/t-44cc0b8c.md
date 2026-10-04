---
uid: c942d88e
id: data.contract.t-44cc0b8c
parent: data.contract
state: planned
tags: ["worker:contract-core", "projection:data-contract"]
name: {zh: "Visibility", en: "Visibility"}
description:
  zh: >
      内容可见性
  en: >
      Content visibility
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/contract/t-44cc0b8c.json"
apis: []
types:
  - name: "Visibility"
    description: {zh: "内容可见性", en: "Content visibility"}
    schema: {"type":"string","enum":["public","unlisted","followers","private"],"description":"public 公开 / unlisted 不公开列出 / followers 仅关注者 / private 私有"}
---
