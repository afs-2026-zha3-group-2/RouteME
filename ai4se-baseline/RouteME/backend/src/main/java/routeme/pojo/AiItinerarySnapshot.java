package routeme.pojo;

import java.util.List;

/**
 * AI 行程快照（契约 AiItinerarySnapshot）：用户确认保存的完整方案，
 * 含高德解析的坐标与路线、Open-Meteo 天气摘要、AI 理由与预算估算。
 *
 * <p>组件名与 JSON 键一致（snake_case），用独立 ObjectMapper 解析校验；
 * 落库保存请求原文，GET 原样返回。route/weather/ai_budget 可空
 * （路线或天气获取失败时用户仍可保存已定位的景点方案）。
 *
 * @param origin       出发地
 * @param destination  目的地
 * @param date         旅行日期 yyyy-MM-dd
 * @param duration     游玩时长档位
 * @param travel_mode  出行方式
 * @param interests    兴趣偏好
 * @param pace         行程节奏
 * @param budget_cents 用户预算（分），可空
 * @param stops        景点列表（含定位结果与顺序）
 * @param route        高德路线汇总，可空
 * @param weather      天气摘要，可空
 * @param tips         AI 出行建议
 * @param packing      AI 建议携带物品
 * @param ai_budget    AI 预算估算，可空
 */
public record AiItinerarySnapshot(
        AiPlace origin,
        AiPlace destination,
        String date,
        String duration,
        String travel_mode,
        List<String> interests,
        String pace,
        Long budget_cents,
        List<Stop> stops,
        Route route,
        WeatherForecast weather,
        List<String> tips,
        List<String> packing,
        AiPlan.Budget ai_budget) {

    /**
     * 快照景点：AI 推荐字段 + 高德定位结果。
     *
     * @param name         POI 名称
     * @param lng          经度；未定位时 null
     * @param lat          纬度；未定位时 null
     * @param order        游玩顺序，从 1 起
     * @param reason       AI 推荐理由
     * @param arrival      建议到达时间 HH:mm
     * @param stay_minutes 建议停留分钟数
     * @param indoor       是否室内活动
     * @param resolved     是否已在高德定位成功
     */
    public record Stop(
            String name,
            Double lng,
            Double lat,
            Integer order,
            String reason,
            String arrival,
            Integer stay_minutes,
            Boolean indoor,
            Boolean resolved) {
    }

    /**
     * 高德路线汇总（距离/时间以高德为准，非 AI 生成）。
     *
     * @param mode             出行方式
     * @param distance_meters  总距离（米）
     * @param duration_seconds 总交通时间（秒）
     * @param legs             相邻景点间的分段路线
     */
    public record Route(String mode, Integer distance_meters, Integer duration_seconds, List<Leg> legs) {
    }

    /**
     * 分段路线。
     *
     * @param from_id          起点景点标识
     * @param to_id            终点景点标识
     * @param distance_meters  分段距离（米）
     * @param duration_seconds 分段时间（秒）
     */
    public record Leg(String from_id, String to_id, Integer distance_meters, Integer duration_seconds) {
    }
}