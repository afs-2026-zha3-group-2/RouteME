package routeme.pojo;

import java.util.List;

/**
 * AI 推荐方案（契约 AiPlan）：只含名称/顺序/理由/时间/估算，
 * 不含经纬度/路线/距离/交通时间（技术边界，地图数据一律来自高德）。
 *
 * <p>组件名与 AI 输出 JSON 键一致（snake_case），既用于解析上游输出，
 * 也直接作为响应体序列化；预算单位为分，恒为 AI 估算。
 *
 * @param title   方案标题
 * @param days    按天分组的行程
 * @param tips    天气相关出行建议
 * @param packing 建议携带物品
 * @param budget  预算估算（四项 + 合计）
 */
public record AiPlan(String title, List<Day> days, List<String> tips, List<String> packing, Budget budget) {

    /**
     * 单日行程。
     *
     * @param day   第几天，从 1 起
     * @param stops 当天景点，按游玩顺序
     */
    public record Day(Integer day, List<Stop> stops) {
    }

    /**
     * 推荐景点。
     *
     * @param name         POI 名称，必须真实存在、高德可搜
     * @param reason       推荐理由
     * @param arrival      建议到达时间 HH:mm
     * @param stay_minutes 建议停留分钟数
     * @param indoor       是否室内活动（雨天优先室内）
     */
    public record Stop(String name, String reason, String arrival, Integer stay_minutes, Boolean indoor) {
    }

    /**
     * 预算估算，单位分；total_cents 由后端按四项和重算，不信任 AI 合计。
     *
     * @param transport_cents 交通
     * @param tickets_cents   门票
     * @param food_cents      餐饮
     * @param other_cents     其他
     * @param total_cents     合计
     */
    public record Budget(Long transport_cents, Long tickets_cents, Long food_cents, Long other_cents, Long total_cents) {

        /** 四项和（后端权威合计）。 */
        public long sum() {
            return transport_cents + tickets_cents + food_cents + other_cents;
        }

        /** 以四项和为合计的副本。 */
        public Budget withRecomputedTotal() {
            return new Budget(transport_cents, tickets_cents, food_cents, other_cents, sum());
        }
    }
}