# normify-delivery · Normify Outline

> 派生索引（每次 normify_build 重建）。AI 导航入口：先广度后深度。

## delivery

- delivery [计划] — 交付分支计划投影 / Delivery branch plan projection — 正式 BranchPlan（plan digest f459426c7368…）的图投影：19 个可独立验证交付组、真实 needs 前置、外部依赖策略、写入范… — [模块 22 · API 40]
  - delivery.requirements [计划] — 正式需求与治理策略 / Formal requirements and governance policy — 正式需求清单与交付治理策略（契约先冻结、外部依赖必须有策略、业务验收必须独立且未执行） — [模块 1 · API 1]
  - delivery.u-acquire [计划] — 内容获取与导入（许可/下载/去重/溯源/导入） / Content acquisition and import — 交付组：6 个叶子模块、12 个独占目标文件、10 项外部契约（contract 1 / baseline 1 / after 8）、2 条正式需求、3 条业务… — [模块 1 · API 2]
  - delivery.u-channel [计划] — 生态频道与频道页（专栏/音频/漫画/赛事/会员购/装扮） / Ecosystem channels and channel pages — 交付组：7 个叶子模块、16 个独占目标文件、16 项外部契约（contract 5 / baseline 2 / after 9）、2 条正式需求、3 条业务… — [模块 1 · API 2]
  - delivery.u-commerce [计划] — 会员交易与账本（含会员中心页） / Membership commerce and ledger — 交付组：9 个叶子模块、22 个独占目标文件、8 项外部契约（contract 1 / baseline 2 / after 5）、2 条正式需求、3 条业务验… — [模块 1 · API 2]
  - delivery.u-community [计划] — 社区互动（评论/管理/点赞/投币/收藏/分享） / Community interactions — 交付组：6 个叶子模块、12 个独占目标文件、11 项外部契约（contract 3 / baseline 2 / after 6）、2 条正式需求、3 条业务… — [模块 1 · API 2]
  - delivery.u-content-pipeline [计划] — 投稿编辑与内容目录（含唯一发布命令、投稿台） / Publishing workspace and content catalog — 交付组：12 个叶子模块、30 个独占目标文件、11 项外部契约（contract 3 / baseline 3 / after 5）、3 条正式需求、3 条业… — [模块 1 · API 2]
  - delivery.u-contract-baseline [计划] — 共享契约与前端基础设施冻结 / Shared contracts and front-end infrastructure freeze — 交付组：10 个叶子模块、30 个独占目标文件、2 项外部契约（contract 2 / baseline 0 / after 0）、3 条正式需求、3 条业务… — [模块 1 · API 2]
  - delivery.u-creator [计划] — 创作中心后端与前端（管理/分析/互动/粉丝/活动/收益） / Creator studio backend and front end — 交付组：11 个叶子模块、24 个独占目标文件、19 项外部契约（contract 9 / baseline 2 / after 8）、2 条正式需求、3 条业… — [模块 1 · API 2]
  - delivery.u-danmaku [计划] — 弹幕全链路（分段/发送/样式/屏蔽/举报/管理/实时） / Danmaku end to end — 交付组：7 个叶子模块、14 个独占目标文件、7 项外部契约（contract 3 / baseline 1 / after 3）、1 条正式需求、3 条业务验… — [模块 1 · API 2]
  - delivery.u-discover [计划] — 搜索发现与首页/搜索页 / Search, discovery, home and search pages — 交付组：10 个叶子模块、20 个独占目标文件、13 项外部契约（contract 3 / baseline 3 / after 7）、2 条正式需求、3 条业… — [模块 1 · API 2]
  - delivery.u-identity [计划] — 身份账号与个人空间（含设置页） / Identity, accounts and personal space (with settings page) — 交付组：9 个叶子模块、24 个独占目标文件、6 项外部契约（contract 0 / baseline 2 / after 4）、2 条正式需求、3 条业务验… — [模块 1 · API 2]
  - delivery.u-integration [计划] — 系统装配与 React 应用壳（路由/Provider/Worker/数据源/可观测/本地栈） / System assembly and React app shell — 交付组：11 个叶子模块、36 个独占目标文件、11 项外部契约（contract 0 / baseline 0 / after 11）、3 条正式需求、3 条… — [模块 1 · API 2]
  - delivery.u-live [计划] — 直播域（准入/房间/推流/弹幕/礼物/预约/回放）与直播页 / Live domain and live page — 交付组：8 个叶子模块、22 个独占目标文件、19 项外部契约（contract 7 / baseline 2 / after 10）、2 条正式需求、3 条业… — [模块 1 · API 2]
  - delivery.u-media [计划] — 媒体管道：上传/探测/转码/封面/字幕/任务 / Media pipeline: ingest, probe, transcode, cover, subtitles, — 交付组：11 个叶子模块、26 个独占目标文件、5 项外部契约（contract 0 / baseline 3 / after 2）、2 条正式需求、3 条业务… — [模块 1 · API 2]
  - delivery.u-message [计划] — 消息中心（私信/通知/系统/偏好/推送/未读） / Messaging center — 交付组：7 个叶子模块、14 个独占目标文件、9 项外部契约（contract 1 / baseline 1 / after 7）、2 条正式需求、3 条业务验… — [模块 1 · API 2]
  - delivery.u-ops [计划] — 运营后台后端与前端（审核/举报/申诉/处罚/版权/配置/客服/审计） / Operations backend and console — 交付组：13 个叶子模块、28 个独占目标文件、13 项外部契约（contract 2 / baseline 3 / after 8）、2 条正式需求、3 条业… — [模块 1 · API 2]
  - delivery.u-pgc [计划] — 版权内容与课堂（含番剧课程页） / Premium content and courses — 交付组：8 个叶子模块、20 个独占目标文件、12 项外部契约（contract 3 / baseline 1 / after 8）、2 条正式需求、3 条业务… — [模块 1 · API 2]
  - delivery.u-platform-core [计划] — 平台底座：接入/RDS/outbox/适配器/部署/迁移 / Platform core: ingress, RDS, outbox, adapters, deploy, — 交付组：23 个叶子模块、207 个独占目标文件、4 项外部契约（contract 2 / baseline 2 / after 0）、2 条正式需求、3 条业… — [模块 1 · API 2]
  - delivery.u-playback [计划] — 播放授权与播放页（含个人中心） / Playback grants and playback page — 交付组：9 个叶子模块、20 个独占目标文件、20 项外部契约（contract 8 / baseline 2 / after 10）、3 条正式需求、3 条业… — [模块 1 · API 2]
  - delivery.u-social [计划] — 关注动态与个人空间页 / Following, dynamics and the personal space page — 交付组：9 个叶子模块、18 个独占目标文件、12 项外部契约（contract 4 / baseline 2 / after 6）、2 条正式需求、3 条业务… — [模块 1 · API 2]
  - delivery.waves [计划] — 可并行波次 / Parallelisable waves — 按 needs 最长路径分层得到的可并行阶段（同波次之间无相互 needs） — [模块 1 · API 1]

