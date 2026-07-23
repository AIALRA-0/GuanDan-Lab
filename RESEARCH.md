# 贯策研究与技术路线

## 产品目标

贯策不是一套换皮棋牌界面，而是把掼蛋拆成可计算、可解释、可训练、可复盘的学习系统

首版以四个闭环为核心

1. 规则内核确保每个动作合法
2. 团队策略层比较牌效、牌权、搭档关系与残局压力
3. 解释层回答为什么、后果是什么、搭档怎么看、还有什么备选
4. 训练层把常见决策模式转为可重复练习的题目

## 权威规则口径

- [国家体育总局棋牌运动管理中心赛事指南](https://www.sport.gov.cn/qpzx/n27319064/n27319058/c27429584/content.html)
- [2023 年全国掼牌公开赛竞赛规程](https://www.sport.gov.cn/n14471/n14481/n14518/c25903605/content.html)
- [竞技掼蛋竞赛规则 PDF](https://gh.nuist.edu.cn/_upload/article/files/e2/4e/9a5343d0450a9580fd4c1f46fc0b/290d8299-e923-4966-a485-b0269c7e11fd.pdf)

当前内核已经覆盖双副牌 108 张、固定搭档、级牌、红桃级牌、普通牌型、炸弹层级、完整过牌轮次、接风与名次升级分值

顺子边界按竞技口径实现，最低顺子为 A2345，不接受 23456

## 算法调查

### 规则搜索与启发式策略

合法着生成是所有训练和 AI 的共同底座，贯策先枚举可行组合，再用团队收益函数排序

当前评分因子包括

- 减少剩余手数
- 控制牌消耗
- 炸弹与逢人配保留
- 搭档是否已经持有牌权
- 下家剩余张数
- 直接走完与残局拦截

这种方法速度快、结果可审计，也适合生成逐手解释

### 信息集蒙特卡洛搜索

掼蛋属于不完全信息合作博弈，IS-MCTS 可以对未知手牌进行一致采样，并在每个信息集内搜索团队长期收益

开源项目 [itsVicOC/guandan](https://github.com/itsVicOC/guandan) 提供了 MIT 许可的 IS-MCTS 与多档 AI 参考实现，贯策只借鉴算法结构，不复制其桌面界面

后续接入点位于 AI 决策层，规则引擎与 UI 不需要重写

### Deep Monte Carlo 与自博弈

- [DanZero](https://arxiv.org/abs/2210.17087) 使用 Deep Monte Carlo 与分布式自博弈训练掼蛋智能体
- [DanZero+](https://arxiv.org/abs/2312.02561) 在 DMC 上增加策略强化学习与预训练模型
- [GuanZero](https://arxiv.org/abs/2402.13582) 引入行为约束编码，改善协作与训练稳定性

这条路线适合大师强度模型，但训练成本远高于浏览器启发式 AI，因此贯策把它设计为可插拔的远端推理层

### 大规模基准与接口

[OpenGuanDan](https://arxiv.org/abs/2602.00676) 提供高效模拟器、规则智能体、学习智能体、玩家接口和人类或 LLM 接入方式，是目前最完整的公开基准方向之一

[OpenGuanDan 仓库](https://github.com/GameAI-NJUPT/OpenGuanDan) 未发现明确开源许可，因此本项目只参考论文与公开接口思想，不复制代码

### 最少手数与拆牌规划

[Guandan-training](https://github.com/zdhgg/Guandan-training) 采用 MIT 许可，展示了最少手数组合、人机对局、AI 对战观察、复盘与 LLM 策略配置的产品方向

贯策把最少手数作为一个评分因子，但不会把它当作唯一目标，因为过度追求短手数会破坏控制牌、炸弹和搭档牌权

### Theory of Mind 与语言教练

[Theory of Mind for Guandan](https://arxiv.org/abs/2408.02559) 表明，LLM 在动态合法动作列表上直接决策并不稳定，但结合动作推荐器与心智推理后效果明显改善

贯策因此采用两阶段结构

1. 规则与算法先给出合法候选和数值排序
2. 解释层再把候选转为自然语言理由

这样可以避免语言模型编造非法牌型

### 反事实解释

[Causal Explanations for Reinforcement Learning](https://ojs.aaai.org/index.php/AAAI/article/view/5631) 提供了用因果与反事实说明智能体动作的通用方法

贯策在每次解释中给出首选方案、用户选择、分差和替代方案影响，让训练者看到不这么走会发生什么

### 通用牌类强化学习平台

[RLCard](https://www.ijcai.org/Proceedings/2020/764) 提供牌类强化学习环境的统一抽象

[DouZero](https://github.com/kwai/DouZero) 证明 Deep Monte Carlo 能在复杂牌类动作空间中取得高强度表现

这些工作用于验证技术路线，不直接作为掼蛋规则来源

## 开源许可边界

| 项目 | 许可 | 使用方式 |
| --- | --- | --- |
| zdhgg/Guandan-training | MIT | 借鉴训练闭环、最少手数和复盘方向 |
| itsVicOC/guandan | MIT | 借鉴 IS-MCTS 分层与 AI 难度设计 |
| GameAI-NJUPT/OpenGuanDan | 未发现明确许可 | 仅参考论文和公开接口思想 |
| submit-paper/Danzero_plus | 未发现明确许可 | 仅参考论文方法，不复制代码 |
| RLCard | MIT | 参考环境与智能体接口抽象 |
| DouZero | Apache-2.0 | 参考 DMC 自博弈工程路线 |

## 当前实现与后续升级

当前版本已经具备可运行的规则引擎、三档 AI、实时解释、反事实比较、三类交互训练、学习洞察、D1 持久化、响应式中文界面和自动化验证

模型接口预留给三项增强

1. IS-MCTS 本地或 Worker 推理
2. DanZero 类 DMC 模型服务
3. 基于牌谱的个性化弱点诊断与题目生成

这三项增强不会改变已经稳定的规则、存储和交互边界
