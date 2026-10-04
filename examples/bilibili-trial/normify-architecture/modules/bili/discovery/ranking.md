---
uid: db8ec16f
id: bili.discovery.ranking
parent: bili.discovery
state: planned
tags: ["worker:disc-rank"]
name: {zh: "榜单与热搜", en: "Rankings and Hot Terms"}
description:
  zh: >
      小时/日/周/月榜单与新人榜、分区榜、热搜词与趋势；快照可重算，不覆盖权威数据。
      
  en: >
      Hourly/daily/weekly/monthly and newcomer boards, partition boards, hot search terms and trends.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/discovery/ranking/src/board.ts"
  - path: "services/discovery/ranking/src/hot-term.ts"
  - path: "services/discovery/ranking/migrations/0001_ranking.sql"
  - path: "services/discovery/ranking/tests/ranking.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/rankings/{boardId}"
    description:
      zh: >
          读取榜单
          
      en: >
          Get ranking board
          
    output: {module: "bili.discovery.ranking", name: "RankingBoard"}
  - protocol: http
    method: GET
    path: "/api/v1/rankings/hot-terms"
    description:
      zh: >
          读取热搜词
          
      en: >
          Get hot search terms
          
    output: {module: "bili.discovery.ranking", name: "HotSearchTerm"}
  - protocol: mysql
    path: "ranking_snapshot"
    description:
      zh: >
          榜单快照表（唯一写入所有者：榜单服务）
          
      en: >
          ranking_snapshot table
          
types:
  - name: "RankingEntry"
    description: {zh: "榜单条目", en: "Ranking entry"}
    schema: {"type":"object","additionalProperties":false,"description":"由事件与行为数据批量重算","properties":{"rank":{"type":"integer","description":"名次","minimum":1},"videoId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"score":{"type":"integer","description":"综合分 ×1000","minimum":0},"deltaRank":{"type":"integer","description":"名次变化（可为负）"},"viewCount":{"type":"integer","description":"播放量","minimum":0},"danmakuCount":{"type":"integer","description":"弹幕数","minimum":0},"interactionCount":{"type":"integer","description":"互动数","minimum":0}},"required":["rank","videoId","score"]}
  - name: "RankingBoard"
    description: {zh: "榜单", en: "Ranking board"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 ranking_snapshot，按 board_id+period_start 唯一","properties":{"boardId":{"type":"string","description":"榜单 id"},"name":{"type":"string","description":"榜单名"},"period":{"type":"string","enum":["hourly","daily","weekly","monthly","newcomer"],"description":"周期"},"partitionId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"entries":{"type":"array","description":"条目","items":{"$ref":"urn:normify:bili.discovery.ranking:RankingEntry"},"maxItems":100},"generatedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"algorithmVersion":{"type":"string","description":"算法版本"},"frozen":{"type":"boolean","description":"是否已冻结（结算后不再更新）"}},"required":["boardId","name","period","entries","generatedAt"]}
  - name: "HotSearchTerm"
    description: {zh: "热搜词", en: "Hot search term"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 hot_search_term，可由搜索行为实时重算","properties":{"term":{"type":"string","description":"词","maxLength":40},"hotScore":{"type":"integer","description":"热度分","minimum":0},"trend":{"type":"string","enum":["rising","falling","flat","new"],"description":"趋势"},"relatedTerms":{"type":"array","description":"相关词","items":{"type":"string","description":"词"}},"updatedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["term","hotScore","trend"]}
deps:
  - kind: event
    to: bili.contract.core.events
    label: {zh: "消费播放/互动事件重算榜单", en: "Recompute from play and reacti"}
  - kind: call
    to: bili.discovery.behavior
    label: {zh: "行为数据作为排序因子", en: "Behavior as ranking factor"}
  - kind: dataflow
    to: bili.data.projections
    label: {zh: "榜单是可重算投影", en: "Boards are rebuildable project"}
---
