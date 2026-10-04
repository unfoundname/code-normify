# bilibili 类视频网站：全量目标架构 / 数据结构 / 分支分工交付报告（评审修正版）

本报告由 pi 在隔离规划仓库中通过 Normify 0.7.0 MCP 工具（architecture / data / delivery）实际生成；所有规模数字都从工具产物计算，不手写。
证据严格分层：**设计/契约静态校验**、**隔离工作树内的 fixture/契约编译验收**、**业务验收（未执行）**、**只读浏览器验收**。

## 一、规模与校验（来自工具产物）

| 视图 | 模块 | 叶子/实体 | 命名类型 | API/表 | 依赖/关系 | 布局 | 校验 | CAS digest |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 架构 architecture | 214 | 186 叶子 | 390 | 278 | 640 | 28 | 0 error / 199 warning | `72bc6aa01bbcb87e…` |
| 数据 data | 170 | 149 业务实体（数据叶 150） | 150 | 299 | 186 | 20 | 0 error / 151 warning | `e19b52a258122306…` |
| 交付投影 delivery | 22 | 19 组 + 需求 + 波次 | — | — | needs DAG | 1 | 0 error / 1 warning | `d05d1559e4fd161f…` |

- 全部 214 个模块为 planned；Worker 标识 20 个；独占目标文件 595 个；最大深度 4 层。
- 数据视图：142 张 RDS 表/实体行 + 7 个搜索投影 = 149 个业务实体；另有 1 个元数据目录叶（data.relations，记录自引用/合法环，不是实体，已从 RDS 计数扣除）；OSS 对象元数据行存于 RDS，计在 RDS 内。
- 正式分支计划：id `bili-full-delivery`；**冻结实现基线** `7b0ea7f5a56933f004bdd50d29b6ffae7bc74cde`（与当前 HEAD `d5c489bdc2eda2106ba4d265f3bbbe38bdfa7026` 允许不同：基线之后的提交只包含报告/证据/文档，不含实现）；plan digest `f459426c73686b5ea9f7165a7053de69f7eef13bda8cd52e2ffc3c26ac750e44`；graph digest 与当前图一致 = true。19 单元的隔离检查确实在基线工作树内执行。
- 外部依赖策略：contract 57 / baseline 34 / after 117，无 unresolved。
- 职责区分：**DDL/迁移文件的维护者是 u-platform-core**（统一迁移与方言）；**每张表的唯一运行期业务写入者是各实体 worker 标签**（如 data.content.video → W-CONTENT），两者不可混同。
- 独立测试运行器契约（已冻结）：.test.ts → `node --test --experimental-strip-types <file>.test.ts`（Node 类型剥离，仅类型/接口/泛型/断言；不得用 enum/namespace/装饰器/JSX）；.test.mjs → `node --test <file>.test.mjs`；.test.tsx（JSX 组件渲染）属**单独前端测试边界**，本轮不冻结其依赖。详见 plan/frozen/test-runner-contract.json，并由 contracts/tests/runner-proof.test.ts 实际执行验证。
- 函数级 API 锚点仅 14 条，全部人工确认：`bili.client.web.video → bili.playback.detail`、`bili.client.web.video → bili.danmaku.segment`、`bili.commerce.order → bili.commerce.payment`、`bili.commerce.payment → bili.commerce.ledger`、`bili.community.coin → bili.commerce.ledger`、`bili.discover.indexing → bili.catalog.event`、`bili.discover.indexing → bili.infra.search`、`bili.ops.audit → bili.catalog.state`、`bili.playback.detail → bili.playback.grant`、`bili.playback.grant → bili.catalog.video`、`bili.playback.grant → bili.pgc.license`、`bili.playback.grant → bili.commerce.vip`、`bili.playback.stream → bili.playback.grant`、`bili.upload.draft → bili.catalog.video`。

## 二、本轮评审修正对照

| # | 评审问题 | 修正 | 证据 |
| --- | --- | --- | --- |
| 1 | 机械把边锚到两端 apis[0]，产生假接口关系 | 删除自动锚定；仅保留 14 条逐条确认的锚点，其余保留模块级边 | 本文锚点清单 + tools/patches.json 的 anchors |
| 2 | 未标注 !/? 的字段被默认可选；靠“像类型/像 API”自动换栏 | 行表改为严格 10 栏 + T:/A:/D: 显式栏位标签（标签缺失或不符即报错）；70 处必填/可选逐一决策并落表 | tools/dsl.mjs（splitRow/fieldSchema）、tools/canonicalize.mjs、tools/marker-fix.json |
| 3 | VideoPart.assetId 用完整对象、弹幕 mode 类型不一致 | assetId 改为统一字符串 ID；DanmakuItem.mode 与 SendDanmakuRequest.mode 统一枚举；数据实体 danmaku_item.mode 同步枚举 | contracts/types/bili.upload.part.ts、bili.danmaku.segment.ts；评审自检项 |
| 4 | 播放授权只接受 bvid；streams 无授权输入 | GrantRequest 改为 resourceType + resourceId（VIDEO/PGC_EPISODE/COURSE_LESSON/LIVE_ROOM/AUDIO/ARTICLE）；StreamRequest.grantId 必填；直播/音频/课时确认走统一授权 | bili.playback.grant、bili.playback.stream、bili.live.room、bili.channel.audio、bili.pgc.course |
| 5 | RequestContext 零引用、写接口缺幂等、用实体当创建请求 | 全部 http 写入口要求显式 *Request 类型 + 必填 idempotencyKey + 必填 requestContext（工具注入并校验）；0 个实体输入被替换为显式请求类型 | 架构 validate 0 error；project/tools/auto-requests-report.json |
| 6 | 发布事件缺 eventId/dedupeKey/producer/occurredAt | VideoPublishedEvent / VideoRemovedEvent 内嵌统一 EventEnvelope（eventId/eventType/eventVersion/producer/consumers/dedupeKey/occurredAt） | bili.catalog.event 类型；评审自检项 6 |
| 7 | 许可证据登记接受调用方提交核验字段；核验无定位输入；下载任务无核验依赖 | 新增 LicenseEvidenceSubmitRequest（不含 licenseVerified/reviewerId）与 LicenseVerifyRequest.evidenceId；核验要求审核角色；下载任务新增“许可已核验”前置 | bili.acquire.license、bili.acquire.job |
| 8 | 私信 ws 无法传文本、醒目留言无文本、舰队缺权益、课程缺章节课时 | DirectMessageFrame（messageId/text/sequence）、SendSuperChatRequest.messageText 必填 + POST /api/v1/live/super-chats、FleetMembership/FleetBenefit 与 durationDays、CourseChapterView/LessonView 与章节课时接口 | 对应模块类型与 API |
| 9 | PageResult.items 封闭摘要无法承载正文/进度/价格 | 保留唯一分页封套字段形态，新增 21 个领域分页类型承载真实条目（评论/历史/稍后再看/礼物/通知/订单/结算/评价/商品/客服/审核/作品/任务/检索/联想/时间线等） | 各模块 *Page 类型；评审自检项 |
| 10 | Timestamp 允许非 UTC 偏移 | Timestamp 增加必须 Z 结尾的模式；新增 5 个负例（含 +08:00 偏移）并断言被拒绝 | core-types.mjs、contracts/negative/negative-cases.json、隔离工作树检查“负例全部被拒绝” |
| 11 | infra.search 反向依赖业务类型 | 新增契约 SearchDocument / SearchQuery；适配器只认契约，领域文档由 bili.discover.indexing 映射后提交 | bili.infra.search 依赖仅 bili.contract.common |
| 12 | 使用 mysql 协议暗示已选定 RDS 方言 | 14 处 mysql 协议改为 rpc@db.table.<table>，描述标注“RDS 方言与适配器待定”；数据视图同步 | 评审自检项 1；tools/patches.json 规则 |

### 分支与独立验证修正

| 项 | 修正 | 证据 |
| --- | --- | --- |
| 工具与输入未闭合在基线 | tools/verify-contracts.mjs（纯 Node 实现；Schema 校验依赖**已 vendored 并版本固定**（ajv 8.20.0 + ajv-formats 3.0.1 + 依赖闭包，见 vendor/VENDOR.md 与 versions.json）、路径相对自身）、plan/frozen/{architecture-graph.json,units.json,instance-contracts.json,event-chain-contract.json,test-runner-contract.json}、contracts/{samples,negative,positive,types,tests} 全部进入固定基线 `7b0ea7f5a569…`，并由 u-contract-baseline（bili.assembly.testkit 与契约模块）声明为写入范围 | git ls-files；plan/units/u-contract-baseline.json |
| 不能声称独立验收 | 19 组检查在 git worktree（固定基线）内实际执行，未借用活目录：全量 --all 退出码 0，逐单元退出码 0/0/0/0/0/0/0/0/0/0/0/0/0/0/0/0/0/0/0 | verification.json 的 isolated_worktree / unit_runs |
| 校验器会跳过缺失或猜测 | 严格失败：缺文件、缺类型、未知 schema 关键字、未解析 $ref 一律失败，无 continue；--unit 只校验该单元 | tools/verify-contracts.mjs |
| 复用 ajv 与主仓 node_modules | 移除 ajv，自带严格子集校验器（type/enum/required/pattern/format/items/$ref/additionalProperties），未知关键字报错 | 同上 |
| plan_digest 写成 plan.id | verification.json 记录工具返回的真实 SHA-256：`f459426c73686b5ea9f7165a7053de69f7eef13bda8cd52e2ffc3c26ac750e44` | verification.json |
| 共享契约 TS 桩缺 import 无法编译 | 42 个契约桩生成真实 import type；在隔离工作树用宿主 tsc（strict、noEmit）编译，退出码 0 | verification.json 的 typescript_compile |
| 业务 case 只有需求全文 + 统一 npm 命令 | 每组 3 条可判定业务验收定义（成功 / 失败权限 / 幂等或状态边界）+ 各自待实现测试入口，共 57 条，全部标记未执行；入口文件已纳入本组可写范围 | plan/frozen/units.json、plan/units/*.json、delivery 图 UnitBusinessCase |
| needs 需为真实前置并说明理由 | 每组 needs_rationale 逐条说明；非前置依赖改用 contract fixture（会员权益、版权地域、账本等） | plan/frozen/units.json、delivery 图 UnitContract.needsRationale |

## 二点五、本轮最终复核修正（接口边界 / 数据语义 / 写范围 / 证据）

| 项 | 结果 | 证据 |
| --- | --- | --- |
| 写请求不再用构建期补齐 | 依赖链已改为 canonicalize → apply-patches → auto-requests → apply-patch2 的**定义期声明**；构建器只做严格报错（本次运行 0 次注入） | tools/apply-patch2.mjs、patch2-report.json、本文「writeApis」计数 |
| 服务端字段与可信边界 | 15 个请求类型剥离服务端字段（mid/officialBadge/userId/status/effectiveAt/exportUrl/reportId/reporterId/uploaderId/durationMs/qualityIds/addedAt/rtcTokenRef/channelTradeNo/nextChargeAt/allowed/reason），并新增 7 条**伪造服务端字段负例** | contracts/negative/negative-cases.json（14 例，包含 7 条伪造例） |
| 权限结论由服务端计算 | EntitlementRequest 只保留提问字段（userId/resourceType/resourceId/requiredTier），结论由 EntitlementDecision 返回 | architecture.json 中 bili.commerce.vip |
| 发布迁移不再嵌套审计对象 | PublishTransitionRequest.toState 改为字符串枚举，changedBy/changedAt 不再出现在请求 | bili.catalog.state |
| 授权验证有真实接口 | 新增 POST /api/v1/playback/grants/verification（GrantVerifyRequest→PlaybackGrant），stream→grant 边锚定到该接口 | bili.playback.grant / bili.playback.stream；显式锚点清单 |
| 单资源 GET 有定位参数 | 新增 9 个查询请求类型与对应 /query 入口（媒体资源/视频/资料/订单/播放详情/弹幕管理/收益/课程/客服工单） | 各模块 *QueryRequest；architecture.json |
| 消息链闭合 | EventEnvelope 含 producer/consumers(ModuleId)/dedupeKey，EventPayload 改为 payloadType+resourceId+resourceType+data（开放对象承载领域载荷）；实际接口已绑定：发布事件→outbox.append 输入→outbox.claim 输出(OutboxDelivery)→MQ 发布输入→消费者输入，并用真实发布/下架/等级样例在标准 Schema 下走完全链 | bili.contract.event / bili.infra.outbox / bili.infra.queue / bili.catalog.event / bili.identity.level；contracts/tests/message-chain.test.mjs |
| 数据 ER 语义 | 109 个枚举约束、15 个数组字段（*Json 不再当 object）、5 条自引用 FK（comment.rootId/parentId、dynamic.forwardOfId、partition.parentId、media.asset.quarantinedFromAssetId，均带索引）、合法环允许存在（ER 不再强制无环）、mid/email 分别唯一、外键标注目标列；oss-object 明确为 RDS 对象元数据行 | normify-data/tree.json、plan/data-relations.json、data-patches-report.json |
| 分支写范围闭合 | 写范围从 223 扩到 595 个文件：含 149 个实体模型/迁移文件与 154 个待实现测试入口；每组的业务验收定义与测试入口同属本组可写范围 | plan/frozen/units.json、plan/units/*.json、branch-packets.json |
| 契约测试可执行 | 基线内 contracts/tests 共 5 个可运行测试（含运行器证明与消息链）；本次隔离工作树内真实 `node --test` 回执：pass 16 / fail 0 | verification.json 的 contract_tests |
| 三图与产物版本一致 | 每个视图 build+render 后核对：HTML 内嵌摘要 = receipt.source_digest = tree.source_digest = 当前图 digest | view-consistency.json |
| 计划语义复验 | 真正调用 branch_plan_validate（不再是只读 plan_get）：0 error / 200 warning；图与计划 digest 一致 | verification.json 的 final_integrity |

### 实际使用的 MCP 通道（准确区分，不夸大）

- 经 **pi 的 MCP 网关**（mcp / mcpScript）直接调用：`normify_schema_get`、`normify_graph_get`（仅读取 Schema 与当前图；**没有**经网关做 graph_validate/put/policy/validate）。
- 经 **基线仓库内的 SDK 客户端**（project/tools/mcp-client.mjs，使用仓库已有的 @modelcontextprotocol/sdk 连接同一批 `lib/mcp.js` 服务）调用：`normify_graph_validate`、`normify_graph_put`、`normify_policy_upsert`、`normify_build`、`normify_render`、`normify_validate`、`normify_branch_plan_suggest/get/validate/put`、`normify_branch_packet`、`normify_branch_plan_export`。
- 两者都是真实 MCP；本轮未调用 `normify_help`。`pi-mcp-trace.jsonl` 只记录经网关的会话，不能用来证明 SDK 调用。


| 模块域 | 叶子 | 类型 | API | 覆盖的产品范围 |
| --- | --- | --- | --- | --- |
| `bili.acquire` | 6 | 10 | 8 | ⑮ 内容获取：许可来源/许可证据/下载/去重/溯源归属/导入主链 |
| `bili.assembly` | 7 | 7 | 7 | ⑯⑱ 系统装配：API 应用/路由注册表/Worker 进程/数据源与 schema/可观测/本地栈 |
| `bili.catalog` | 5 | 17 | 10 | ②⑲ 内容目录与唯一发布命令、发布状态机与发布事件 |
| `bili.channel` | 6 | 10 | 8 | ⑰ 生态频道：专栏/音频/漫画/游戏赛事/会员购/装扮 |
| `bili.client` | 32 | 33 | 32 | ⑱ React Web 与创作/运营前端：领域功能目录 + 共享组件/路由/装配独占 |
| `bili.commerce` | 8 | 21 | 15 | ⑪ 会员交易：大会员权益/充值/B币电池/充电/订单/支付回调/退款/对账/账本 |
| `bili.community` | 6 | 16 | 12 | ⑥ 社区：评论/置顶精选/点赞/投币账本/收藏/分享/互动统计 |
| `bili.contract` | 4 | 27 | 4 | 冻结契约：ID/时间/金额/分页/错误/幂等/事件封套/状态机/账本/播放授权/检索文档 |
| `bili.creator` | 6 | 14 | 9 | ⑬ 创作中心：投稿管理/数据分析/弹幕评论管理/粉丝分析/活动任务/收益提现 |
| `bili.danmaku` | 7 | 14 | 8 | ⑤ 弹幕：分段/发送/样式/屏蔽偏好/举报/UP 主管理/实时 |
| `bili.discover` | 8 | 17 | 10 | ⑨ 搜索发现：首页/分区/榜单/建议/多类型检索/推荐/行为反馈/索引投影 |
| `bili.identity` | 8 | 31 | 19 | ① 身份/账号安全/实名/权限/等级/资料/空间/隐私黑名单 |
| `bili.infra` | 23 | 26 | 29 | ⑯ 基础设施：Web 接入/RDS/OSS/outbox 任务/缓存搜索 CDN MQ 接入/部署备份监控容量；迁移脚本 |
| `bili.live` | 7 | 21 | 12 | ⑩ 直播：准入/房间推流/实时弹幕/礼物舰队/预约/连麦/回放转投稿 |
| `bili.media` | 11 | 22 | 20 | ③ 媒体：分片断点上传/OSS 原件/探测/转码/封面/预览/音轨/字幕/任务重试 |
| `bili.message` | 6 | 13 | 9 | ⑧ 消息：私信/互动通知/系统提醒/偏好未读/推送通道 |
| `bili.ops` | 9 | 26 | 17 | ⑭ 运营后台：审核/举报/申诉/处罚/版权投诉/推荐位/活动标签/客服/操作审计 |
| `bili.pgc` | 7 | 18 | 13 | ⑫ 版权与课堂：番剧影视/系列季剧集/排期/追番/评分/试看/地域期限/课程进度 |
| `bili.playback` | 7 | 15 | 10 | ④ 播放：详情/清晰度字幕倍速/连播/历史/进度/稍后再看/统一播放授权 |
| `bili.social` | 7 | 16 | 13 | ⑦ 关注动态：关注分组/粉丝/图文视频转发动态/话题/合集订阅/动态流 |
| `bili.upload` | 6 | 16 | 13 | ② 投稿：草稿/多分P/合集/分区标签/联合投稿/预约/编辑下架 |

## 四、数据结构图

| 数据域 | 实体数 | 说明 |
| --- | --- | --- |
| `data.acquire` | 6 | 许可来源/许可证据/获取任务/去重/溯源/导入记录 |
| `data.channel` | 10 | 专栏与版本/音频与专辑/漫画与章节/赛事/会员购商品/装扮与拥有关系 |
| `data.client` | 2 | 客户端界面偏好/弹幕本地偏好备份（仅偏好，无媒体二进制） |
| `data.commerce` | 13 | 账本账户/分录/过账对/会员/权益/订单与条目/支付意图/退款/对账/钱包/充电方案与订阅 |
| `data.community` | 6 | 评论/点赞/硬币账本分录/收藏夹与条目/分享 |
| `data.content` | 13 | 草稿/版本/分P/合集与条目/联合投稿/排期/视频目录/审核记录/发布迁移/分区/标签/关系 |
| `data.creator` | 4 | 创作任务与领取/收益结算单/提现请求 |
| `data.danmaku` | 6 | 弹幕分片/条目（mode 枚举）/样式/偏好/举报/管理动作 |
| `data.discover` | 4 | 搜索历史/推荐候选/行为反馈/首页渲染快照 |
| `data.identity` | 11 | 账号/凭据/会话/登录尝试/实名/角色/等级/资料/隐私/黑名单/注销 |
| `data.infra` | 7 | Outbox 消息/任务租约/幂等记录/配置/告警规则/备份计划/迁移记录 |
| `data.live` | 9 | 主播档案/直播间/推流端点/连麦/礼物目录与交易/预约/回放/直播弹幕 |
| `data.media` | 11 | OSS 对象元数据/媒体资源/上传会话/探测/转码任务与版本/音轨/字幕/封面/预览/任务租约 |
| `data.message` | 6 | 私信会话/参与者/消息/互动通知/系统提醒/偏好 |
| `data.ops` | 10 | 审核任务与结论/举报/申诉/处罚/版权投诉/推荐位/活动/客服工单/操作审计日志 |
| `data.pgc` | 11 | 版权窗口/季度/剧集/排期/追番/评分/试看/课程章节课时与进度 |
| `data.playback` | 5 | 播放授权/进度/历史/稍后再看/连播序列 |
| `data.projection` | 7 | 检索文档/互动统计/动态流/榜单快照/热搜/未读计数/粉丝概览（事件投影，非权威写入源） |
| `data.relations` | 1 |  |
| `data.social` | 8 | 关注关系/分组与成员/动态与媒体/话题/合集订阅/屏蔽规则 |

## 五、分支分工：19 个可独立验证的交付组

| 组 | Lead Worker | 叶子 | 独占文件 | 需求 | needs 前置 | 外部依赖策略 | 设计检查（隔离工作树） |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `u-contract-baseline` 共享契约与前端基础设施冻结 | W-CONTRACT | 10 | 30 | 3 | — | contract×2 | exit 0 |
| `u-platform-core` 平台底座：接入/RDS/outbox/适配器/部署/迁移 | W-INFRA | 23 | 207 | 2 | `u-contract-baseline` | baseline×2 contract×2 | exit 0 |
| `u-identity` 身份账号与个人空间（含设置页） | W-IDENTITY | 9 | 24 | 2 | `u-contract-baseline`<br>`u-platform-core` | after×4 baseline×2 | exit 0 |
| `u-content-pipeline` 投稿编辑与内容目录（含唯一发布命令、投稿台） | W-CONTENT | 12 | 30 | 3 | `u-contract-baseline`<br>`u-platform-core`<br>`u-identity` | after×5 baseline×3 contract×3 | exit 0 |
| `u-media` 媒体管道：上传/探测/转码/封面/字幕/任务 | W-MEDIA | 11 | 26 | 2 | `u-contract-baseline`<br>`u-platform-core` | baseline×3 after×2 | exit 0 |
| `u-playback` 播放授权与播放页（含个人中心） | W-PLAYBACK | 9 | 20 | 3 | `u-contract-baseline`<br>`u-platform-core`<br>`u-content-pipeline`<br>`u-media`<br>`u-identity` | after×10 contract×8 baseline×2 | exit 0 |
| `u-danmaku` 弹幕全链路（分段/发送/样式/屏蔽/举报/管理/实时） | W-DANMAKU | 7 | 14 | 1 | `u-contract-baseline`<br>`u-platform-core`<br>`u-content-pipeline` | after×3 baseline×1 contract×3 | exit 0 |
| `u-community` 社区互动（评论/管理/点赞/投币/收藏/分享） | W-COMMUNITY | 6 | 12 | 2 | `u-contract-baseline`<br>`u-platform-core`<br>`u-content-pipeline`<br>`u-identity` | after×6 contract×3 baseline×2 | exit 0 |
| `u-social` 关注动态与个人空间页 | W-SOCIAL | 9 | 18 | 2 | `u-contract-baseline`<br>`u-platform-core`<br>`u-identity`<br>`u-content-pipeline` | after×6 baseline×2 contract×4 | exit 0 |
| `u-message` 消息中心（私信/通知/系统/偏好/推送/未读） | W-MESSAGE | 7 | 14 | 2 | `u-contract-baseline`<br>`u-platform-core`<br>`u-identity` | after×7 baseline×1 contract×1 | exit 0 |
| `u-discover` 搜索发现与首页/搜索页 | W-DISCOVER | 10 | 20 | 2 | `u-contract-baseline`<br>`u-platform-core`<br>`u-content-pipeline` | after×7 baseline×3 contract×3 | exit 0 |
| `u-live` 直播域（准入/房间/推流/弹幕/礼物/预约/回放）与直播页 | W-LIVE | 8 | 22 | 2 | `u-contract-baseline`<br>`u-platform-core`<br>`u-identity`<br>`u-media`<br>`u-commerce` | contract×7 after×10 baseline×2 | exit 0 |
| `u-commerce` 会员交易与账本（含会员中心页） | W-COMMERCE | 9 | 22 | 2 | `u-contract-baseline`<br>`u-platform-core`<br>`u-identity` | after×5 baseline×2 contract×1 | exit 0 |
| `u-pgc` 版权内容与课堂（含番剧课程页） | W-PGC | 8 | 20 | 2 | `u-contract-baseline`<br>`u-platform-core`<br>`u-content-pipeline`<br>`u-media`<br>`u-commerce`<br>`u-playback` | contract×3 after×8 baseline×1 | exit 0 |
| `u-creator` 创作中心后端与前端（管理/分析/互动/粉丝/活动/收益） | W-CREATOR | 11 | 24 | 2 | `u-contract-baseline`<br>`u-platform-core`<br>`u-content-pipeline`<br>`u-identity` | after×8 contract×9 baseline×2 | exit 0 |
| `u-ops` 运营后台后端与前端（审核/举报/申诉/处罚/版权/配置/客服/审计） | W-OPS | 13 | 28 | 2 | `u-contract-baseline`<br>`u-platform-core`<br>`u-content-pipeline`<br>`u-identity`<br>`u-community`<br>`u-danmaku` | contract×2 after×8 baseline×3 | exit 0 |
| `u-acquire` 内容获取与导入（许可/下载/去重/溯源/导入） | W-ACQUIRE | 6 | 12 | 2 | `u-contract-baseline`<br>`u-platform-core`<br>`u-content-pipeline`<br>`u-media` | after×8 baseline×1 contract×1 | exit 0 |
| `u-channel` 生态频道与频道页（专栏/音频/漫画/赛事/会员购/装扮） | W-CHANNEL | 7 | 16 | 2 | `u-contract-baseline`<br>`u-platform-core`<br>`u-content-pipeline`<br>`u-commerce`<br>`u-media` | after×9 baseline×2 contract×5 | exit 0 |
| `u-integration` 系统装配与 React 应用壳（路由/Provider/Worker/数据源/可观测/本地栈） | W-ASSEMBLY | 11 | 36 | 3 | `u-contract-baseline`<br>`u-platform-core`<br>`u-identity`<br>`u-content-pipeline`<br>`u-media`<br>`u-playback`<br>`u-commerce`<br>`u-discover`<br>`u-message` | after×11 | exit 0 |

### 可并行阶段（needs 最长路径分层）

- **W0**（并行 1 组）：`u-contract-baseline`
- **W1**（并行 1 组）：`u-platform-core`
- **W2**（并行 2 组）：`u-identity`、`u-media`
- **W3**（并行 3 组）：`u-commerce`、`u-content-pipeline`、`u-message`
- **W4**（并行 9 组）：`u-acquire`、`u-channel`、`u-community`、`u-creator`、`u-danmaku`、`u-discover`、`u-live`、`u-playback`、`u-social`
- **W5**（并行 3 组）：`u-integration`、`u-ops`、`u-pgc`

> needs 只表达真实实施前置，每组 needs_rationale 给出理由（例如播放组不把会员/版权列为前置，而用冻结契约 fixture；集成组的前置是它要挂载的域成果）。

### 每组负责内容 / 文件 / 需求 / 依赖 / 验收

#### u-contract-baseline — 共享契约与前端基础设施冻结 / Shared contracts and front-end infrastructure freeze

- Lead Worker：`W-CONTRACT`；工作区 `packages/contracts`；叶子模块 10 个。
- 独占目标文件（30）：
  - `apps/api/test/contract-toolkit.ts`
  - `apps/api/tests/tests/contract-toolkit.test.ts`
  - `apps/web/src/shared/design/index.ts`
  - `apps/web/src/shared/design/tokens.ts`
  - `apps/web/src/shared/http/client.ts`
  - `apps/web/src/shared/i18n/format-money.ts`
  - `apps/web/src/shared/i18n/index.ts`
  - `apps/web/src/shared/player/danmaku-layer.tsx`
  - `apps/web/src/shared/player/index.tsx`
  - `apps/web/src/shared/uploader/chunk-manager.ts`
  - `apps/web/src/shared/uploader/index.tsx`
  - `apps/web/tests/shared/design/index.test.ts`
  - … 其余 18 个见 project/plan/units/u-contract-baseline.json
- 覆盖需求：`R00-contract-freeze`、`R18-frontend`、`R20-data-ownership`
- needs：无（契约冻结组）
- 外部依赖策略：contract 2 项（`bili.infra.db`、`bili.playback.stream`）
- 设计/fixture 检查（已执行，隔离工作树）：`node tools/verify-contracts.mjs --unit u-contract-baseline`
- 业务验收定义（未执行）：
  - `contracts-compile-and-fixtures`（入口 `contracts/tests/common.test.mjs`）：成功（已实际执行）：契约测试入口用基线 vendored Ajv 校验全部样例、断言伪造服务端字段与非法取值被拒绝、并检查写请求均已声明幂等键与请求上下文；strict tsc --noEmit 另由 tools/contracts-tsc.mjs 在集成阶段执行
  - `fixtures-validate-and-negatives-rejected`（入口 `contracts/tests/event.test.mjs`）：成功：全部样例通过 Schema 校验，且 5 个负例（本地时区时间/带空格 ID/浮点金额/缺 hasMore/缺必填）全部被拒绝（已实际执行）
  - `contract-has-no-reverse-dependency`（入口 `contracts/tests/state.test.mjs`）：失败面：任何共享契约模块依赖业务模块时必须报错阻断（policy contract-not-business-dependent 为 error）
- 隔离资源：unit-db(database)、unit-port(port)、unit-tmp(filesystem)、unit-oss-prefix(service)

#### u-platform-core — 平台底座：接入/RDS/outbox/适配器/部署/迁移 / Platform core: ingress, RDS, outbox, adapters, deploy, migrations

- Lead Worker：`W-INFRA`；工作区 `services/platform`；叶子模块 23 个。
- 独占目标文件（207）：
  - `infra/backup/plan.md`
  - `infra/backup/restore-drill.md`
  - `infra/backup/tests/plan.test.ts`
  - `infra/backup/tests/restore-drill.test.ts`
  - `infra/capacity/loadtest.md`
  - `infra/capacity/model.md`
  - `infra/capacity/tests/loadtest.test.ts`
  - `infra/capacity/tests/model.test.ts`
  - `infra/deploy/k8s/api.yaml`
  - `infra/deploy/k8s/tests/api.test.ts`
  - `infra/deploy/k8s/tests/worker.test.ts`
  - `infra/deploy/k8s/worker.yaml`
  - … 其余 195 个见 project/plan/units/u-platform-core.json
- 覆盖需求：`R16-infra`、`R20-data-ownership`
- needs 理由：前置：迁移与 outbox 记录必须使用冻结的 Id/Timestamp/EventEnvelope 契约，否则表结构与事件封套无法冻结
- 外部依赖策略：baseline 2 项（`bili.contract.common`、`bili.contract.event`）；contract 2 项（`bili.identity.rbac`、`bili.media.storage`）
- 设计/fixture 检查（已执行，隔离工作树）：`node tools/verify-contracts.mjs --unit u-platform-core`
- 业务验收定义（未执行）：
  - `migrations-apply-on-isolated-db`（入口 `migrations/infra/tests/migration.test.ts`）：成功：11 个域的 0001_init.sql 在隔离数据库顺序执行，schema_migration 记录 checksum 且可重入（幂等）
  - `table-owner-enforced`（入口 `services/platform/db/tests/repository.test.ts`）：失败面：写非本域表、或缺少表所有者声明的写入被拒绝并返回 PERMISSION_DENIED
  - `outbox-exactly-once-effect`（入口 `services/platform/outbox/tests/outbox.test.ts`）：状态边界：同 dedupeKey 的消息重复投递只产生一次业务效果；租约过期可重新领取
- 隔离资源：unit-db(database)、unit-port(port)、unit-tmp(filesystem)、unit-oss-prefix(service)

#### u-identity — 身份账号与个人空间（含设置页） / Identity, accounts and personal space (with settings page)

- Lead Worker：`W-IDENTITY`；工作区 `services/identity`；叶子模块 9 个。
- 独占目标文件（24）：
  - `apps/web/src/features/settings/SettingsPage.tsx`
  - `apps/web/tests/features/settings/SettingsPage.test.tsx`
  - `services/identity/account/src/account.ts`
  - `services/identity/account/src/session.ts`
  - `services/identity/account/tests/account.test.ts`
  - `services/identity/account/tests/session.test.ts`
  - `services/identity/deletion/src/deletion.ts`
  - `services/identity/deletion/tests/deletion.test.ts`
  - `services/identity/level/src/level.ts`
  - `services/identity/level/tests/level.test.ts`
  - `services/identity/privacy/src/privacy.ts`
  - `services/identity/privacy/tests/privacy.test.ts`
  - … 其余 12 个见 project/plan/units/u-identity.json
- 覆盖需求：`R01-identity`、`R18-frontend`
- needs 理由：前置：账号/会话/权限落在 identity_* 表，需要已冻结的 RDS 访问层与事务边界
- needs 理由：前置：实名与权限契约使用统一 Id/Timestamp 与错误形态
- 外部依赖策略：after 4 项（`bili.client.shared.design`、`bili.client.shared.http`、`bili.infra.db`、`bili.infra.outbox`）；baseline 2 项（`bili.contract.common`、`bili.contract.event`）
- 设计/fixture 检查（已执行，隔离工作树）：`node tools/verify-contracts.mjs --unit u-identity`
- 业务验收定义（未执行）：
  - `register-login-verify-flow`（入口 `services/identity/account/tests/account.test.ts`）：成功：注册→登录→会话刷新→实名→等级初始化，account/credential/session 三表一致
  - `permission-and-ban-boundaries`（入口 `services/identity/rbac/tests/rbac.test.ts`）：失败面：未实名调用需实名能力返回 403；被封禁账号登录被拒并写 login_attempt；无权限码调用后台接口返回 PERMISSION_DENIED
  - `register-idempotent-and-deletion-cooling`（入口 `services/identity/deletion/tests/deletion.test.ts`）：幂等/状态边界：同 idempotencyKey 重复注册只建一个账号；注销冷却期内登录被拒绝
- 隔离资源：unit-db(database)、unit-port(port)、unit-tmp(filesystem)、unit-oss-prefix(service)

#### u-content-pipeline — 投稿编辑与内容目录（含唯一发布命令、投稿台） / Publishing workspace and content catalog

- Lead Worker：`W-CONTENT`；工作区 `services/upload`；叶子模块 12 个。
- 独占目标文件（30）：
  - `apps/web/src/features/publish/PublishWorkspace.tsx`
  - `apps/web/src/features/publish/part-editor.tsx`
  - `apps/web/tests/features/publish/PublishWorkspace.test.tsx`
  - `apps/web/tests/features/publish/part-editor.test.tsx`
  - `services/catalog/event/src/publish-event.ts`
  - `services/catalog/event/tests/publish-event.test.ts`
  - `services/catalog/query/src/query.ts`
  - `services/catalog/query/tests/query.test.ts`
  - `services/catalog/state/src/publish-state.ts`
  - `services/catalog/state/tests/publish-state.test.ts`
  - `services/catalog/taxonomy/src/taxonomy.ts`
  - `services/catalog/taxonomy/tests/taxonomy.test.ts`
  - … 其余 18 个见 project/plan/units/u-content-pipeline.json
- 覆盖需求：`R02-upload`、`R19-publish-chain`、`R20-data-ownership`
- needs 理由：前置：发布命令需要投稿者身份与权限（identity）
- needs 理由：前置：草稿/目录写入 content_* 表，需要 RDS 访问层与迁移
- needs 理由：前置：发布事件使用冻结的事件封套
- 外部依赖策略：after 5 项（`bili.client.shared.design`、`bili.client.shared.http`、`bili.identity.profile`、`bili.infra.db` …）；baseline 3 项（`bili.contract.common`、`bili.contract.event`、`bili.contract.state`）；contract 3 项（`bili.media.asset`、`bili.media.state`、`bili.ops.audit`）
- 设计/fixture 检查（已执行，隔离工作树）：`node tools/verify-contracts.mjs --unit u-content-pipeline`
- 业务验收定义（未执行）：
  - `draft-to-published-chain`（入口 `services/catalog/video/tests/video.test.ts`）：成功：草稿→分P→媒体就绪→唯一发布命令→PUBLISHED，且发布事件写入 outbox
  - `publish-preconditions-rejected`（入口 `services/upload/draft/tests/draft.test.ts`）：失败面：媒体未就绪/无投稿权限/审核未通过时发布返回 PRECONDITION_FAILED，且不产生 catalog_video 行
  - `publish-and-transition-idempotent`（入口 `services/catalog/state/tests/publish-state.test.ts`）：幂等/状态边界：同 bvid 重复发布命令幂等；非法发布状态迁移被拒绝
- 隔离资源：unit-db(database)、unit-port(port)、unit-tmp(filesystem)、unit-oss-prefix(service)

#### u-media — 媒体管道：上传/探测/转码/封面/字幕/任务 / Media pipeline: ingest, probe, transcode, cover, subtitles, jobs

- Lead Worker：`W-MEDIA`；工作区 `services/media`；叶子模块 11 个。
- 独占目标文件（26）：
  - `services/media/asset/src/asset.ts`
  - `services/media/asset/src/version-index.ts`
  - `services/media/asset/tests/asset.test.ts`
  - `services/media/asset/tests/version-index.test.ts`
  - `services/media/audio/src/audio.ts`
  - `services/media/audio/tests/audio.test.ts`
  - `services/media/cover/src/cover.ts`
  - `services/media/cover/tests/cover.test.ts`
  - `services/media/ingest/src/upload-session.ts`
  - `services/media/ingest/tests/upload-session.test.ts`
  - `services/media/job/src/job-lease.ts`
  - `services/media/job/tests/job-lease.test.ts`
  - … 其余 14 个见 project/plan/units/u-media.json
- 覆盖需求：`R03-media`、`R19-publish-chain`
- needs 理由：前置：对象存储适配器与任务租约来自平台底座
- needs 理由：前置：媒体资源与产物元数据写入 media_* 表并复用统一状态机契约
- 外部依赖策略：baseline 3 项（`bili.contract.common`、`bili.contract.event`、`bili.contract.state`）；after 2 项（`bili.infra.db`、`bili.infra.outbox`）
- 设计/fixture 检查（已执行，隔离工作树）：`node tools/verify-contracts.mjs --unit u-media`
- 业务验收定义（未执行）：
  - `upload-probe-transcode-ready`（入口 `services/media/ingest/tests/upload-session.test.ts`）：成功：分片上传→探测→3 档转码→字幕/音轨登记，asset 最终 READY
  - `hash-mismatch-and-dead-letter`（入口 `services/media/transcode/tests/transcode.test.ts`）：失败面：分片哈希不符时完成上传被拒绝；转码重试超过 attemptLimit 进入死信且状态 FAILED
  - `dedupe-and-lease-exactly-once`（入口 `services/media/job/tests/job-lease.test.ts`）：幂等/状态边界：同 sha256+owner 的原件不重复创建；租约过期任务被重新领取后仍只执行一次
- 隔离资源：unit-db(database)、unit-port(port)、unit-tmp(filesystem)、unit-oss-prefix(service)

#### u-playback — 播放授权与播放页（含个人中心） / Playback grants and playback page

- Lead Worker：`W-PLAYBACK`；工作区 `services/playback`；叶子模块 9 个。
- 独占目标文件（20）：
  - `apps/web/src/features/member/MemberCenter.tsx`
  - `apps/web/src/features/video/VideoPage.tsx`
  - `apps/web/src/features/video/danmaku-panel.tsx`
  - `apps/web/tests/features/member/MemberCenter.test.tsx`
  - `apps/web/tests/features/video/VideoPage.test.tsx`
  - `apps/web/tests/features/video/danmaku-panel.test.tsx`
  - `services/playback/detail/src/detail.ts`
  - `services/playback/detail/tests/detail.test.ts`
  - `services/playback/grant/src/grant.ts`
  - `services/playback/grant/tests/grant.test.ts`
  - `services/playback/history/src/history.ts`
  - `services/playback/history/tests/history.test.ts`
  - … 其余 8 个见 project/plan/units/u-playback.json
- 覆盖需求：`R04-playback`、`R19-publish-chain`、`R18-frontend`
- needs 理由：前置：授权必须核验视频发布状态与可见性（catalog）
- needs 理由：前置：签名地址来自转码产物（media）
- needs 理由：前置：黑名单/隐私与登录态判定来自 identity
- needs 理由：非前置：会员权益与版权地域以 commerce.vip、pgc.license 的冻结契约 fixture 提供（策略 contract）
- 外部依赖策略：after 10 项（`bili.catalog.query`、`bili.catalog.video`、`bili.client.shared.design`、`bili.client.shared.http` …）；contract 8 项（`bili.commerce.vip`、`bili.community.comment`、`bili.community.favorite`、`bili.community.like` …）；baseline 2 项（`bili.contract.common`、`bili.contract.state`）
- 设计/fixture 检查（已执行，隔离工作树）：`node tools/verify-contracts.mjs --unit u-playback`
- 业务验收定义（未执行）：
  - `grant-covers-video-lesson-room-audio`（入口 `services/playback/grant/tests/grant.test.ts`）：成功：视频、剧集课时、直播间、音频都通过同一 GrantRequest 签发授权与地址
  - `grant-denial-matrix`（入口 `services/playback/grant/tests/grant.test.ts`）：失败面：未登录 NEED_LOGIN、非会员 NEED_VIP、地域不符 REGION_LOCKED、审核中 UNDER_REVIEW、已删除 DELETED，全部不签发地址
  - `grant-expiry-and-binding`（入口 `services/playback/stream/tests/stream.test.ts`）：状态边界：过期授权请求地址被拒绝；同一 grantId 不能换资源复用；进度上报只影响本人历史
- 隔离资源：unit-db(database)、unit-port(port)、unit-tmp(filesystem)、unit-oss-prefix(service)

#### u-danmaku — 弹幕全链路（分段/发送/样式/屏蔽/举报/管理/实时） / Danmaku end to end

- Lead Worker：`W-DANMAKU`；工作区 `services/danmaku`；叶子模块 7 个。
- 独占目标文件（14）：
  - `services/danmaku/manage/src/manage.ts`
  - `services/danmaku/manage/tests/manage.test.ts`
  - `services/danmaku/preference/src/preference.ts`
  - `services/danmaku/preference/tests/preference.test.ts`
  - `services/danmaku/protocol/src/realtime.ts`
  - `services/danmaku/protocol/tests/realtime.test.ts`
  - `services/danmaku/report/src/report.ts`
  - `services/danmaku/report/tests/report.test.ts`
  - `services/danmaku/segment/src/segment.ts`
  - `services/danmaku/segment/tests/segment.test.ts`
  - `services/danmaku/send/src/send.ts`
  - `services/danmaku/send/tests/send.test.ts`
  - … 其余 2 个见 project/plan/units/u-danmaku.json
- 覆盖需求：`R05-danmaku`
- needs 理由：前置：弹幕挂在已发布稿件上，需要目录可见性判定
- needs 理由：前置：分片存储与发送写入 danmaku_* 表
- 外部依赖策略：after 3 项（`bili.catalog.video`、`bili.infra.db`、`bili.infra.outbox`）；baseline 1 项（`bili.contract.common`）；contract 3 项（`bili.identity.security`、`bili.ops.audit`、`bili.ops.report`）
- 设计/fixture 检查（已执行，隔离工作树）：`node tools/verify-contracts.mjs --unit u-danmaku`
- 业务验收定义（未执行）：
  - `segment-fetch-and-send`（入口 `services/danmaku/segment/tests/segment.test.ts`）：成功：分段拉取按时间排序；发送落入对应分片且分片版本递增
  - `block-and-rate-limit`（入口 `services/danmaku/send/tests/send.test.ts`）：失败面：命中屏蔽词/黑名单发送被拒绝；超频返回 RATE_LIMITED；非 UP 主执行管理动作返回 PERMISSION_DENIED
  - `send-idempotent-and-moderation-effect`（入口 `services/danmaku/manage/tests/manage.test.ts`）：幂等/状态边界：同 idempotencyKey 只产生一条；UP 主删除后拉取不再返回该条
- 隔离资源：unit-db(database)、unit-port(port)、unit-tmp(filesystem)、unit-oss-prefix(service)

#### u-community — 社区互动（评论/管理/点赞/投币/收藏/分享） / Community interactions

- Lead Worker：`W-COMMUNITY`；工作区 `services/community`；叶子模块 6 个。
- 独占目标文件（12）：
  - `services/community/coin/src/coin.ts`
  - `services/community/coin/tests/coin.test.ts`
  - `services/community/comment/src/comment.ts`
  - `services/community/comment/tests/comment.test.ts`
  - `services/community/favorite/src/favorite.ts`
  - `services/community/favorite/tests/favorite.test.ts`
  - `services/community/like/src/like.ts`
  - `services/community/like/tests/like.test.ts`
  - `services/community/moderation/src/moderation.ts`
  - `services/community/moderation/tests/moderation.test.ts`
  - `services/community/share/src/share.ts`
  - `services/community/share/tests/share.test.ts`
- 覆盖需求：`R06-community`、`R20-data-ownership`
- needs 理由：前置：评论/投币对象是已发布内容（catalog）
- needs 理由：前置：互动计数是事件投影，需要 outbox 消费者
- needs 理由：非前置：账本分录以 commerce.ledger 冻结契约 fixture 提供
- 外部依赖策略：after 6 项（`bili.catalog.video`、`bili.identity.privacy`、`bili.identity.security`、`bili.infra.cdn` …）；contract 3 项（`bili.commerce.ledger`、`bili.message.notify`、`bili.ops.audit`）；baseline 2 项（`bili.contract.common`、`bili.contract.ledger`）
- 设计/fixture 检查（已执行，隔离工作树）：`node tools/verify-contracts.mjs --unit u-community`
- 业务验收定义（未执行）：
  - `comment-like-coin-favorite`（入口 `services/community/comment/tests/comment.test.ts`）：成功：评论/回复/点赞/投币/收藏/分享成功并更新互动统计投影
  - `closed-section-and-duplicate-like`（入口 `services/community/moderation/tests/moderation.test.ts`）：失败面：关闭评论区的稿件发表评论被拒绝；重复点赞不增加计数
  - `coin-ledger-and-idempotency`（入口 `services/community/coin/tests/coin.test.ts`）：幂等/状态边界：投币累计不超上限；同 idempotencyKey 重复投币只产生一条 coin_ledger_entry
- 隔离资源：unit-db(database)、unit-port(port)、unit-tmp(filesystem)、unit-oss-prefix(service)

#### u-social — 关注动态与个人空间页 / Following, dynamics and the personal space page

- Lead Worker：`W-SOCIAL`；工作区 `services/social`；叶子模块 9 个。
- 独占目标文件（18）：
  - `apps/web/src/features/dynamic/DynamicPage.tsx`
  - `apps/web/src/features/space/SpacePage.tsx`
  - `apps/web/tests/features/dynamic/DynamicPage.test.tsx`
  - `apps/web/tests/features/space/SpacePage.test.tsx`
  - `services/social/dynamic/src/dynamic.ts`
  - `services/social/dynamic/tests/dynamic.test.ts`
  - `services/social/feed/src/feed.ts`
  - `services/social/feed/tests/feed.test.ts`
  - `services/social/follow/src/follow.ts`
  - `services/social/follow/tests/follow.test.ts`
  - `services/social/group/src/group.ts`
  - `services/social/group/tests/group.test.ts`
  - … 其余 6 个见 project/plan/units/u-social.json
- 覆盖需求：`R07-social`、`R18-frontend`
- needs 理由：前置：关注与动态归属真实账号（identity）
- needs 理由：前置：动态可引用视频与合集（catalog）
- 外部依赖策略：after 6 项（`bili.catalog.query`、`bili.client.shared.design`、`bili.client.shared.http`、`bili.identity.profile` …）；baseline 2 项（`bili.contract.common`、`bili.contract.state`）；contract 4 项（`bili.discover.recommend`、`bili.message.notify`、`bili.ops.audit`、`bili.pgc.series`）
- 设计/fixture 检查（已执行，隔离工作树）：`node tools/verify-contracts.mjs --unit u-social`
- 业务验收定义（未执行）：
  - `follow-then-feed`（入口 `services/social/feed/tests/feed.test.ts`）：成功：关注后动态流出现该作者动态；图文/视频/转发动态均可发布
  - `block-and-limit`（入口 `services/social/follow/tests/follow.test.ts`）：失败面：被拉黑用户关注被拒绝；超过关注上限返回 RATE_LIMITED
  - `unfollow-and-idempotency`（入口 `services/social/group/tests/group.test.ts`）：幂等/状态边界：取关后动态流不再出现该作者；重复关注幂等
- 隔离资源：unit-db(database)、unit-port(port)、unit-tmp(filesystem)、unit-oss-prefix(service)

#### u-message — 消息中心（私信/通知/系统/偏好/推送/未读） / Messaging center

- Lead Worker：`W-MESSAGE`；工作区 `services/message`；叶子模块 7 个。
- 独占目标文件（14）：
  - `apps/web/src/features/message/MessageCenter.tsx`
  - `apps/web/tests/features/message/MessageCenter.test.tsx`
  - `services/message/dm/src/dm.ts`
  - `services/message/dm/tests/dm.test.ts`
  - `services/message/notify/src/notify.ts`
  - `services/message/notify/tests/notify.test.ts`
  - `services/message/preference/src/preference.ts`
  - `services/message/preference/tests/preference.test.ts`
  - `services/message/push/src/push-adapter.ts`
  - `services/message/push/tests/push-adapter.test.ts`
  - `services/message/system/src/system-notice.ts`
  - `services/message/system/tests/system-notice.test.ts`
  - … 其余 2 个见 project/plan/units/u-message.json
- 覆盖需求：`R08-message`、`R18-frontend`
- needs 理由：前置：会话参与者与权限来自身份/隐私设置
- needs 理由：前置：未读与通知计数是事件投影
- 外部依赖策略：after 7 项（`bili.client.shared.design`、`bili.client.shared.http`、`bili.identity.level`、`bili.identity.privacy` …）；baseline 1 项（`bili.contract.common`）；contract 1 项（`bili.ops.activity`）
- 设计/fixture 检查（已执行，隔离工作树）：`node tools/verify-contracts.mjs --unit u-message`
- 业务验收定义（未执行）：
  - `dm-frame-carries-message`（入口 `services/message/dm/tests/dm.test.ts`）：成功：私信 ws 帧包含 messageId/text/conversationId 且未读 +1
  - `participant-and-permission`（入口 `services/message/dm/tests/dm.test.ts`）：失败面：非参与者读写会话返回 PERMISSION_DENIED；关闭私信的用户拒收
  - `idempotent-send-and-unread-reset`（入口 `services/message/unread/tests/unread.test.ts`）：幂等/状态边界：同 idempotencyKey 只落一条消息；标记已读后未读归零
- 隔离资源：unit-db(database)、unit-port(port)、unit-tmp(filesystem)、unit-oss-prefix(service)

#### u-discover — 搜索发现与首页/搜索页 / Search, discovery, home and search pages

- Lead Worker：`W-DISCOVER`；工作区 `services/discover`；叶子模块 10 个。
- 独占目标文件（20）：
  - `apps/web/src/features/home/HomePage.tsx`
  - `apps/web/src/features/search/SearchPage.tsx`
  - `apps/web/tests/features/home/HomePage.test.tsx`
  - `apps/web/tests/features/search/SearchPage.test.tsx`
  - `services/discover/feedback/src/feedback.ts`
  - `services/discover/feedback/tests/feedback.test.ts`
  - `services/discover/home/src/home.ts`
  - `services/discover/home/tests/home.test.ts`
  - `services/discover/indexing/src/index-projection.ts`
  - `services/discover/indexing/tests/index-projection.test.ts`
  - `services/discover/rank/src/rank.ts`
  - `services/discover/rank/tests/rank.test.ts`
  - … 其余 8 个见 project/plan/units/u-discover.json
- 覆盖需求：`R09-discover`、`R18-frontend`
- needs 理由：前置：检索文档由发布/下架事件投影，事件来自内容主链
- needs 理由：前置：搜索服务适配器由平台底座提供（无外部搜索服务时按适配器契约替换）
- 外部依赖策略：after 7 项（`bili.catalog.event`、`bili.catalog.query`、`bili.client.shared.design`、`bili.client.shared.http` …）；baseline 3 项（`bili.contract.common`、`bili.contract.event`、`bili.contract.state`）；contract 3 项（`bili.ops.audit`、`bili.ops.recommend`、`bili.social.follow`）
- 设计/fixture 检查（已执行，隔离工作树）：`node tools/verify-contracts.mjs --unit u-discover`
- 业务验收定义（未执行）：
  - `publish-projects-to-search`（入口 `services/discover/indexing/tests/index-projection.test.ts`）：成功：发布事件→检索文档→关键词命中；首页与榜单结构完整
  - `unaudited-excluded`（入口 `services/discover/search/tests/search.test.ts`）：失败面：审核未通过/已下架内容不出现在检索、榜单与首页
  - `projection-idempotent`（入口 `services/discover/indexing/tests/index-projection.test.ts`）：幂等边界：同一 bvid 重复投影为幂等 upsert；分页游标稳定
- 隔离资源：unit-db(database)、unit-port(port)、unit-tmp(filesystem)、unit-oss-prefix(service)

#### u-live — 直播域（准入/房间/推流/弹幕/礼物/预约/回放）与直播页 / Live domain and live page

- Lead Worker：`W-LIVE`；工作区 `services/live`；叶子模块 8 个。
- 独占目标文件（22）：
  - `apps/web/src/features/live/LiveRoom.tsx`
  - `apps/web/src/features/live/gift-panel.tsx`
  - `apps/web/tests/features/live/LiveRoom.test.tsx`
  - `apps/web/tests/features/live/gift-panel.test.tsx`
  - `services/live/apply/src/apply.ts`
  - `services/live/apply/tests/apply.test.ts`
  - `services/live/danmaku/src/live-danmaku.ts`
  - `services/live/danmaku/tests/live-danmaku.test.ts`
  - `services/live/gift/src/fleet.ts`
  - `services/live/gift/src/gift.ts`
  - `services/live/gift/tests/fleet.test.ts`
  - `services/live/gift/tests/gift.test.ts`
  - … 其余 10 个见 project/plan/units/u-live.json
- 覆盖需求：`R10-live`、`R18-frontend`
- needs 理由：前置：主播准入依赖实名与审核（identity/ops 契约）
- needs 理由：前置：回放复用媒体管道（media）
- needs 理由：前置：礼物/舰队扣款需要真实钱包与账本（commerce）
- 外部依赖策略：contract 7 项（`bili.catalog.taxonomy`、`bili.danmaku.preference`、`bili.danmaku.send`、`bili.message.push` …）；after 10 项（`bili.client.shared.design`、`bili.client.shared.http`、`bili.commerce.ledger`、`bili.commerce.wallet` …）；baseline 2 项（`bili.contract.common`、`bili.contract.ledger`）
- 设计/fixture 检查（已执行，隔离工作树）：`node tools/verify-contracts.mjs --unit u-live`
- 业务验收定义（未执行）：
  - `apply-stream-danmaku-gift-replay`（入口 `services/live/room/tests/room.test.ts`）：成功：主播准入→开播→推流地址→实时弹幕→礼物→回放转投稿全链路
  - `stream-permission-and-balance`（入口 `services/live/gift/tests/gift.test.ts`）：失败面：未通过准入申请推流地址被拒绝；余额不足送礼返回 PRECONDITION_FAILED
  - `gift-idempotent-and-sc-text-required`（入口 `services/live/gift/tests/gift.test.ts`）：幂等/状态边界：同 idempotencyKey 重复送礼只记一次账；醒目留言缺 messageText 被拒绝；下播后不可再收礼
- 隔离资源：unit-db(database)、unit-port(port)、unit-tmp(filesystem)、unit-oss-prefix(service)

#### u-commerce — 会员交易与账本（含会员中心页） / Membership commerce and ledger

- Lead Worker：`W-COMMERCE`；工作区 `services/commerce`；叶子模块 9 个。
- 独占目标文件（22）：
  - `apps/web/src/features/vip/VipCenter.tsx`
  - `apps/web/tests/features/vip/VipCenter.test.tsx`
  - `services/commerce/charge/src/charge.ts`
  - `services/commerce/charge/tests/charge.test.ts`
  - `services/commerce/ledger/src/ledger.ts`
  - `services/commerce/ledger/tests/ledger.test.ts`
  - `services/commerce/order/src/order.ts`
  - `services/commerce/order/tests/order.test.ts`
  - `services/commerce/payment/src/callback.ts`
  - `services/commerce/payment/src/payment.ts`
  - `services/commerce/payment/tests/callback.test.ts`
  - `services/commerce/payment/tests/payment.test.ts`
  - … 其余 10 个见 project/plan/units/u-commerce.json
- 覆盖需求：`R11-commerce`、`R20-data-ownership`
- needs 理由：前置：订单/钱包/账本账户挂在真实用户上（identity）
- needs 理由：前置：账本与幂等记录写入 RDS，需要平台底座事务与迁移
- 外部依赖策略：after 5 项（`bili.client.shared.design`、`bili.client.shared.http`、`bili.identity.profile`、`bili.infra.db` …）；baseline 2 项（`bili.contract.common`、`bili.contract.ledger`）；contract 1 项（`bili.creator.income`）
- 设计/fixture 检查（已执行，隔离工作树）：`node tools/verify-contracts.mjs --unit u-commerce`
- 业务验收定义（未执行）：
  - `topup-to-entitlement`（入口 `services/commerce/order/tests/order.test.ts`）：成功：充值→订单→支付回调→账本分录→余额更新→会员权益生效
  - `signature-and-balance-rejected`（入口 `services/commerce/payment/tests/payment.test.ts`）：失败面：回调签名校验失败被拒且不写账本；余额不足下单被拒绝；无权限查询他人账本返回 PERMISSION_DENIED
  - `callback-idempotent-and-reconcile`（入口 `services/commerce/reconcile/tests/reconcile.test.ts`）：幂等/状态边界：同 idempotencyKey 重复回调只入账一次；渠道差异被记录进对账报告
- 隔离资源：unit-db(database)、unit-port(port)、unit-tmp(filesystem)、unit-oss-prefix(service)

#### u-pgc — 版权内容与课堂（含番剧课程页） / Premium content and courses

- Lead Worker：`W-PGC`；工作区 `services/pgc`；叶子模块 8 个。
- 独占目标文件（20）：
  - `apps/web/src/features/pgc/CoursePage.tsx`
  - `apps/web/src/features/pgc/SeasonPage.tsx`
  - `apps/web/tests/features/pgc/CoursePage.test.tsx`
  - `apps/web/tests/features/pgc/SeasonPage.test.tsx`
  - `services/pgc/course/src/course.ts`
  - `services/pgc/course/src/progress.ts`
  - `services/pgc/course/tests/course.test.ts`
  - `services/pgc/course/tests/progress.test.ts`
  - `services/pgc/follow/src/follow.ts`
  - `services/pgc/follow/tests/follow.test.ts`
  - `services/pgc/license/src/license.ts`
  - `services/pgc/license/tests/license.test.ts`
  - … 其余 8 个见 project/plan/units/u-pgc.json
- 覆盖需求：`R12-pgc`、`R18-frontend`
- needs 理由：前置：剧集需要映射已发布视频（catalog）与媒体产物（media）
- needs 理由：前置：试看与付费播放需要统一授权与会员权益（playback/commerce）
- 外部依赖策略：contract 3 项（`bili.acquire.license`、`bili.identity.security`、`bili.social.subscription`）；after 8 项（`bili.catalog.video`、`bili.client.shared.design`、`bili.client.shared.http`、`bili.commerce.vip` …）；baseline 1 项（`bili.contract.common`）
- 设计/fixture 检查（已执行，隔离工作树）：`node tools/verify-contracts.mjs --unit u-pgc`
- 业务验收定义（未执行）：
  - `season-episode-course-flow`（入口 `services/pgc/series/tests/series.test.ts`）：成功：版权窗口→季度→剧集→排期→追番→评分→试看；课程章节与课时映射视频
  - `license-and-territory-denial`（入口 `services/pgc/license/tests/license.test.ts`）：失败面：窗口过期 LICENSE_EXPIRED、地域不符 REGION_LOCKED、未购买课程看付费课时被拒绝
  - `trial-then-entitlement`（入口 `services/pgc/trial/tests/trial.test.ts`）：状态边界：试看超时必须升级为会员授权；同一用户重复评分被覆盖而非累加
- 隔离资源：unit-db(database)、unit-port(port)、unit-tmp(filesystem)、unit-oss-prefix(service)

#### u-creator — 创作中心后端与前端（管理/分析/互动/粉丝/活动/收益） / Creator studio backend and front end

- Lead Worker：`W-CREATOR`；工作区 `services/creator`；叶子模块 11 个。
- 独占目标文件（24）：
  - `apps/studio/src/features/analytics/AnalyticsConsole.tsx`
  - `apps/studio/src/features/content/ContentEditor.tsx`
  - `apps/studio/src/features/dashboard/Dashboard.tsx`
  - `apps/studio/src/features/interact/InteractConsole.tsx`
  - `apps/studio/src/features/monetize/MonetizeConsole.tsx`
  - `apps/studio/tests/features/analytics/AnalyticsConsole.test.tsx`
  - `apps/studio/tests/features/content/ContentEditor.test.tsx`
  - `apps/studio/tests/features/dashboard/Dashboard.test.tsx`
  - `apps/studio/tests/features/interact/InteractConsole.test.tsx`
  - `apps/studio/tests/features/monetize/MonetizeConsole.test.tsx`
  - `services/creator/activity/src/activity.ts`
  - `services/creator/activity/tests/activity.test.ts`
  - … 其余 12 个见 project/plan/units/u-creator.json
- 覆盖需求：`R13-creator`、`R18-frontend`
- needs 理由：前置：创作数据基于已发布稿件与目录（catalog.query，含上传者资料引用）
- needs 理由：前置：互动管理复用评论与弹幕管理动作，而这些动作依内容主链与身份（content/identity）
- needs 理由：非前置：收益结算以 commerce.ledger 冻结契约 fixture 提供（契约层替身，不是行为 mock）
- 外部依赖策略：after 8 项（`bili.catalog.video`、`bili.client.shared.design`、`bili.client.shared.http`、`bili.infra.db` …）；contract 9 项（`bili.commerce.ledger`、`bili.community.comment`、`bili.community.moderation`、`bili.danmaku.manage` …）；baseline 2 项（`bili.contract.common`、`bili.contract.state`）
- 设计/fixture 检查（已执行，隔离工作树）：`node tools/verify-contracts.mjs --unit u-creator`
- 业务验收定义（未执行）：
  - `studio-overview-and-settlement`（入口 `services/creator/manage/tests/manage.test.ts`）：成功：稿件/数据/粉丝/互动/收益结算单均可查，任务奖励可领取
  - `ownership-and-withdrawal-limits`（入口 `services/creator/income/tests/income.test.ts`）：失败面：非稿件归属者调用互动管理返回 PERMISSION_DENIED；提现超过可提现额被拒绝
  - `task-claim-and-statement-boundary`（入口 `services/creator/activity/tests/activity.test.ts`）：幂等/状态边界：同任务不可重复领取奖励；已确认结算单不可重复提现
- 隔离资源：unit-db(database)、unit-port(port)、unit-tmp(filesystem)、unit-oss-prefix(service)

#### u-ops — 运营后台后端与前端（审核/举报/申诉/处罚/版权/配置/客服/审计） / Operations backend and console

- Lead Worker：`W-OPS`；工作区 `services/ops`；叶子模块 13 个。
- 独占目标文件（28）：
  - `apps/ops-console/src/features/audit/AuditConsole.tsx`
  - `apps/ops-console/src/features/config/ConfigConsole.tsx`
  - `apps/ops-console/src/features/governance/GovernanceConsole.tsx`
  - `apps/ops-console/src/features/service/ServiceConsole.tsx`
  - `apps/ops-console/tests/features/audit/AuditConsole.test.tsx`
  - `apps/ops-console/tests/features/config/ConfigConsole.test.tsx`
  - `apps/ops-console/tests/features/governance/GovernanceConsole.test.tsx`
  - `apps/ops-console/tests/features/service/ServiceConsole.test.tsx`
  - `services/ops/activity/src/activity.ts`
  - `services/ops/activity/tests/activity.test.ts`
  - `services/ops/appeal/src/appeal.ts`
  - `services/ops/appeal/tests/appeal.test.ts`
  - … 其余 16 个见 project/plan/units/u-ops.json
- 覆盖需求：`R14-ops`、`R20-data-ownership`
- needs 理由：前置：审核结论驱动发布状态迁移（catalog.state），必须已有唯一发布状态机
- needs 理由：前置：审核员权限与操作者身份来自 identity.rbac / identity.account
- needs 理由：说明：审核目标用多态 resourceType（VIDEO/DANMAKU/COMMENT/...）标识，不构成对 community/danmaku 的编译期依赖；这两组与运营后台的端到端联动在 u-integration 验证
- 外部依赖策略：contract 2 项（`bili.acquire.provenance`、`bili.message.system`）；after 8 项（`bili.catalog.state`、`bili.catalog.taxonomy`、`bili.client.shared.design`、`bili.client.shared.http` …）；baseline 3 项（`bili.contract.common`、`bili.contract.event`、`bili.contract.state`）
- 设计/fixture 检查（已执行，隔离工作树）：`node tools/verify-contracts.mjs --unit u-ops`
- 业务验收定义（未执行）：
  - `audit-decision-drives-publish-state`（入口 `services/ops/audit/tests/audit.test.ts`）：成功：审核结论→发布状态迁移→搜索投影同步；举报/申诉/处罚/版权投诉按状态机流转
  - `reviewer-permission-and-single-handling`（入口 `services/ops/report/tests/report.test.ts`）：失败面：无审核权限提交结论返回 PERMISSION_DENIED；已处理工单重复处理被拒绝
  - `penalty-effect-and-append-only-log`（入口 `services/ops/penalty/tests/penalty.test.ts`）：状态边界：处罚生效后内容不可见、解除后恢复；操作审计日志只追加不可修改
- 隔离资源：unit-db(database)、unit-port(port)、unit-tmp(filesystem)、unit-oss-prefix(service)

#### u-acquire — 内容获取与导入（许可/下载/去重/溯源/导入） / Content acquisition and import

- Lead Worker：`W-ACQUIRE`；工作区 `services/acquire`；叶子模块 6 个。
- 独占目标文件（12）：
  - `services/acquire/dedupe/src/dedupe.ts`
  - `services/acquire/dedupe/tests/dedupe.test.ts`
  - `services/acquire/import/src/import.ts`
  - `services/acquire/import/tests/import.test.ts`
  - `services/acquire/job/src/job.ts`
  - `services/acquire/job/tests/job.test.ts`
  - `services/acquire/license/src/license-evidence.ts`
  - `services/acquire/license/tests/license-evidence.test.ts`
  - `services/acquire/provenance/src/provenance.ts`
  - `services/acquire/provenance/tests/provenance.test.ts`
  - `services/acquire/source/src/source.ts`
  - `services/acquire/source/tests/source.test.ts`
- 覆盖需求：`R15-acquire`、`R19-publish-chain`
- needs 理由：前置：获取到的原件进入媒体管道（media）
- needs 理由：前置：导入动作复用投稿主链与唯一发布命令（catalog）
- 外部依赖策略：after 8 项（`bili.catalog.video`、`bili.infra.config`、`bili.infra.db`、`bili.infra.outbox` …）；baseline 1 项（`bili.contract.common`）；contract 1 项（`bili.identity.rbac`）
- 设计/fixture 检查（已执行，隔离工作树）：`node tools/verify-contracts.mjs --unit u-acquire`
- 业务验收定义（未执行）：
  - `source-to-import`（入口 `services/acquire/import/tests/import.test.ts`）：成功：登记来源→登记并核验许可证据→下载任务→去重→溯源→导入为草稿→发布
  - `unverified-license-rejected`（入口 `services/acquire/license/tests/license-evidence.test.ts`）：失败面：许可证据未核验时创建下载任务被拒绝；无核验角色的账号调用核验接口返回 PERMISSION_DENIED
  - `dedupe-and-import-idempotency`（入口 `services/acquire/dedupe/tests/dedupe.test.ts`）：幂等/状态边界：同指纹内容被标记 dedupeOf；同 idempotencyKey 重复导入只创建一份草稿；溯源记录不可变
- 隔离资源：unit-db(database)、unit-port(port)、unit-tmp(filesystem)、unit-oss-prefix(service)

#### u-channel — 生态频道与频道页（专栏/音频/漫画/赛事/会员购/装扮） / Ecosystem channels and channel pages

- Lead Worker：`W-CHANNEL`；工作区 `services/channel`；叶子模块 7 个。
- 独占目标文件（16）：
  - `apps/web/src/features/channel/ArticlePage.tsx`
  - `apps/web/src/features/channel/AudioPage.tsx`
  - `apps/web/tests/features/channel/ArticlePage.test.tsx`
  - `apps/web/tests/features/channel/AudioPage.test.tsx`
  - `services/channel/article/src/article.ts`
  - `services/channel/article/tests/article.test.ts`
  - `services/channel/audio/src/audio.ts`
  - `services/channel/audio/tests/audio.test.ts`
  - `services/channel/dressup/src/dressup.ts`
  - `services/channel/dressup/tests/dressup.test.ts`
  - `services/channel/esports/src/match.ts`
  - `services/channel/esports/tests/match.test.ts`
  - … 其余 4 个见 project/plan/units/u-channel.json
- 覆盖需求：`R17-channel`、`R18-frontend`
- needs 理由：前置：专栏/音频需要目录与媒体管道
- needs 理由：前置：会员购/装扮购买复用统一订单与账本（commerce）
- 外部依赖策略：after 9 项（`bili.client.shared.design`、`bili.client.shared.http`、`bili.commerce.ledger`、`bili.commerce.order` …）；baseline 2 项（`bili.contract.common`、`bili.contract.state`）；contract 5 项（`bili.discover.indexing`、`bili.identity.profile`、`bili.live.room`、`bili.ops.audit` …）
- 设计/fixture 检查（已执行，隔离工作树）：`node tools/verify-contracts.mjs --unit u-channel`
- 业务验收定义（未执行）：
  - `channel-publish-and-buy`（入口 `services/channel/article/tests/article.test.ts`）：成功：专栏/音频/漫画/赛事/装扮发布或购买成功；音频播放持有统一授权
  - `paid-content-without-entitlement`（入口 `services/channel/manga/tests/manga.test.ts`）：失败面：无权益访问付费漫画章节返回 NEED_VIP；已下架商品不可下单
  - `ownership-unique`（入口 `services/channel/dressup/tests/dressup.test.ts`）：状态边界：用户与装扮的拥有关系唯一；同一订单重复支付回调只入账一次
- 隔离资源：unit-db(database)、unit-port(port)、unit-tmp(filesystem)、unit-oss-prefix(service)

#### u-integration — 系统装配与 React 应用壳（路由/Provider/Worker/数据源/可观测/本地栈） / System assembly and React app shell

- Lead Worker：`W-ASSEMBLY`；工作区 `apps/api`；叶子模块 11 个。
- 独占目标文件（36）：
  - `apps/api/src/app.ts`
  - `apps/api/src/datasource.ts`
  - `apps/api/src/observability.ts`
  - `apps/api/src/routes.ts`
  - `apps/api/tests/app.test.ts`
  - `apps/api/tests/datasource.test.ts`
  - `apps/api/tests/observability.test.ts`
  - `apps/api/tests/routes.test.ts`
  - `apps/web/package.json`
  - `apps/web/src/app/nav-model.ts`
  - `apps/web/src/app/providers.tsx`
  - `apps/web/src/app/route-manifest.ts`
  - … 其余 24 个见 project/plan/units/u-integration.json
- 覆盖需求：`R16-infra`、`R18-frontend`、`R19-publish-chain`
- needs 理由：前置：装配要挂载的路由/Worker/投影来自上述域，缺一即无法编译装配目标
- needs 理由：说明：needs 只表达“装配依赖这些域的成果存在”，不代表这些域必须串行开发；各域对装配的依赖不在 needs 中
- 外部依赖策略：after 11 项（`bili.client.shared.design`、`bili.client.web.home`、`bili.client.web.publish`、`bili.client.web.video` …）
- 设计/fixture 检查（已执行，隔离工作树）：`node tools/verify-contracts.mjs --unit u-integration`
- 业务验收定义（未执行）：
  - `assembly-boots-all-domains`（入口 `apps/api/tests/app.test.ts`）：成功：app.ts 装配全部域路由并通过健康检查；worker 注册表启动成功
  - `duplicate-route-fails-fast`（入口 `apps/api/tests/routes.test.ts`）：失败面：重复路由或重复权限码在启动时失败（fail fast），不静默覆盖
  - `no-silent-skip-of-contracts`（入口 `apps/worker/tests/main.test.ts`）：失败面：装配 Worker/域时缺契约或未实现必须显式报错并停止注册，不得静默跳过或降级；共享契约工具自身的验收在 u-contract-baseline 组内进行
- 隔离资源：unit-db(database)、unit-port(port)、unit-tmp(filesystem)、unit-oss-prefix(service)

## 六、实际执行证据（严格分层）

### 6.1 设计/契约静态校验（已执行）
- 三视图 normify_validate：架构 0 error / 199 warning；数据 0 error / 151 warning；交付 0 error / 1 warning。
- 正式 BranchPlan：plan digest `f459426c73686b5ea9f7165a7053de69f7eef13bda8cd52e2ffc3c26ac750e44`，graph digest 与当前图一致 = true；19 单元恰好覆盖 186 个叶子。
- 评审自检脚本（本轮新增，只读）：17/17 通过；明细 project/.review-checks.json。

### 6.2 隔离工作树内的设计/fixture 验收（已执行，不借用活目录）
- 工作树 .verify-worktree @ `7b0ea7f5a56933f004bdd50d29b6ffae7bc74cde`（等于 base_commit：true）。
- 全量：`node tools/verify-contracts.mjs --all` 退出码 0，校验 390 个类型实例、186 个叶子归属、写入独占、外部依赖策略、负例拒绝。
- 逐单元：19 次 node tools/verify-contracts.mjs --unit <unit>，退出码 0/0/0/0/0/0/0/0/0/0/0/0/0/0/0/0/0/0/0（全部 0）。
- TypeScript 冻结契约：tsc -p contracts/types/tsconfig.json 在隔离工作树内退出码 0（44 个桩文件、57 条跨文件 import）。
- fixture 与负例：186 个样例（390 个类型实例）通过严格校验；19 个负例全部被拒绝。

### 6.3 业务验收（未执行）
- 57 条业务验收定义已登记（成功 / 失败权限 / 幂等或状态边界 + 待实现测试入口），executed=false；基线内不存在业务实现或测试文件，因此没有任何业务通过结论。

### 6.4 只读浏览器验收（抽样）
- architecture：根层 21 个节点；下钻 bili.client:5 子节点/22 详情面板；bili.contract:4 子节点/0 详情面板；bili.assembly:7 子节点/0 详情面板；截图 architecture.png
- data：根层 20 个节点；下钻 data.content:13 子节点/0 详情面板；data.media:11 子节点/0 详情面板；data.relations:0 子节点/2 详情面板；截图 data.png
- delivery：根层 21 个节点；下钻 delivery.waves:0 子节点/3 详情面板；delivery.u-playback:0 子节点/4 详情面板；delivery.u-integration:0 子节点/4 详情面板；截图 delivery.png
- index：根层 n/a 个节点；截图 index.png
- 页面错误：0 个；未覆盖范围：抽样范围：3 个视图的根层 + 每个根层抽 2-3 个直接子节点点击（每条路径都会真正渲染子层或详情面板）；未逐层穷举全部 214/170/22 个模块；未验证交互细节（搜索、双语切换、深链接分享、导出）；未在移动端/多浏览器验证，也未做无障碍与性能测量；未验证任何业务页面（业务实现不存在）
- 视图版本一致性：architecture=一致(72bc6aa01bbc)、data=一致(e19b52a25812)、delivery=一致(d05d1559e4fd)
- 基线内**可运行契约测试**：contracts/tests/*.test.mjs 共 5 个文件，本次真实 `node --test` 回执 pass 16 / fail 0（含消息链运输→消费测试与类型化载荷编译）；另 5 个正例与 19 个负例由 Ajv 严格校验。

## 七、资源缺口与待配置项

| 资源 | 现状 | 设计中如何处理 |
| --- | --- | --- |
| 服务器 | 用户已提供，配置/数量/地域未给出 | 部署与容量模块给出编排、灰度、扩容阈值与成本模型；连接参数待配置 |
| RDS | 用户已提供，**引擎未指定** | 统一关系模型 + 按域迁移；图中不使用 mysql 协议自称已选方言，实施前冻结方言与适配器 |
| OSS | 用户已提供，bucket/参数未给出 | 原件与产物以对象元数据建模；签名地址经 CDN 适配器签发 |
| Redis 缓存 | 未提供 | bili.infra.cache 适配器 + 键策略与 TTL，无缓存时按 RDS 兜底 |
| MQ | 未提供 | 先 RDS outbox + 任务租约；MQ 为 bili.infra.queue 的显式迁移 |
| 搜索服务 | 未提供 | 检索文档由发布事件投影；适配器只认 SearchDocument 契约，可替换 ES/OpenSearch |
| CDN | 未提供 | bili.infra.cdn 统一签名与刷新；无 CDN 时回退对象存储签名地址 |
| RTC（连麦） | 未提供 | 只保存凭据引用；厂商在实施期接入 |
| 支付渠道 | 未提供 | 支付意图 + 回调验签 + 对账的适配边界已定义 |
| 短信/推送 | 未提供 | bili.message.push 通道适配，模板与回执契约已定义 |
| 视频资源 | 用户没有视频资源 | 内容获取域覆盖许可来源、许可证据、下载、去重、溯源归属与导入 |

## 八、不可声称的边界

- 本报告只包含设计契约与规划基线：业务实现、迁移执行、部署与集成均未发生；所有模块状态为 planned。
- 设计/fixture 检查与契约编译通过 ≠ 业务测试通过；业务验收定义已登记但未执行。
- 工具不创建分支/工作树/Worker/写权限，也不消费 base_commit 或 after 策略；worker-plan.json 的 lead_ref 只是模板引用，须由宿主核对正式配置。
- 容量、阈值与成本数字是设计参数，需在真实压测后修订。
