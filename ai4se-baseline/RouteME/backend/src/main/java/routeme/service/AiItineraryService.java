package routeme.service;

import routeme.pojo.AiGenerateResponse;
import routeme.pojo.AiItinerarySaved;
import routeme.request.AiGenerateRequest;

/**
 * AI 行程：生成（真实天气自取注入 + DeepSeek 推荐 + 输出结构校验）
 * 与快照整存整取（归属当前用户）。
 */
public interface AiItineraryService {

    /**
     * 按用户条件生成推荐方案。
     *
     * <p>流程：输入校验 → Key 配置检查（503）→ Open-Meteo 自取天气（失败即终止，
     * 不调 AI）→ 提示词组装（天气行为规则 / 预算约束 / 时长档位 / 禁止地图数据）→
     * DeepSeek 调用 → JSON 校验（围栏剥离 / 必需字段 / stops ≥2 / total 重算）。
     * 非法输出不自动重试（L-03）。
     *
     * @param request 用户旅行条件
     * @return 方案 + 本次生成实际使用的天气摘要
     */
    AiGenerateResponse generate(AiGenerateRequest request);

    /**
     * 保存用户确认的完整快照：校验必填字段、已定位景点 ≥2 与坐标数值后
     * 原文落库，归属当前用户；非法输入抛 {@code INVALID_INPUT} 且不落库。
     *
     * @param snapshotJson 快照 JSON 原文
     * @param userId       当前演示用户 id
     * @return 保存回执（快照 id）
     */
    AiItinerarySaved saveSnapshot(String snapshotJson, long userId);

    /**
     * 读取本人快照原文；不存在或非本人抛 {@code INVALID_INPUT}
     * （与发布链接校验同口径）。供发布页预填、详情页摘要与行程链接校验。
     *
     * @param id     快照 id
     * @param userId 当前演示用户 id
     * @return 快照 JSON 原文
     */
    String requireOwnedSnapshot(long id, long userId);
}