package routeme.pojo;

/**
 * 行政区划字典中的二级节点（市 / 港澳台二级区）。
 *
 * <p>目的地以 6 位代码为权威，展示名由字典派生：直辖市与港澳台使用省级展示名，
 * 避免出现「市辖区」这类内部节点名。</p>
 */
public record AreaCity(
        String provinceCode,
        String provinceName,
        String cityCode,
        String cityName) {

    private static final String MUNICIPALITY_DISTRICT = "市辖区";

    /** 对外展示的市名；「市辖区」回退到省级名。 */
    public String displayName() {
        return MUNICIPALITY_DISTRICT.equals(cityName) ? provinceName : cityName;
    }
}