package routeme.constant;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

import routeme.pojo.AreaCity;

/**
 * 发布侧可用的行政区划二级节点。
 *
 * <p>REQ-007 的全国字典与 V10 迁移由 {@code add-destination-area-filters} 提供；在它落地前，
 * 这里只覆盖灵感首页与存量种子实际使用的省市（广东 14 城 + 香港 / 澳门二级区），
 * 让发布链路可以先按「代码为权威」工作。该集合会在该 change 落地时被完整字典替换。</p>
 */
public final class AreaConstant {

    public static final int CODE_LENGTH = 6;
    private static final String PROVINCE_LEVEL_SUFFIX = "0000";

    private static final List<AreaCity> CITIES = List.of(
            new AreaCity("440000", "广东省", "440100", "广州"),
            new AreaCity("440000", "广东省", "440200", "韶关"),
            new AreaCity("440000", "广东省", "440300", "深圳"),
            new AreaCity("440000", "广东省", "440400", "珠海"),
            new AreaCity("440000", "广东省", "440500", "汕头"),
            new AreaCity("440000", "广东省", "440600", "佛山"),
            new AreaCity("440000", "广东省", "440700", "江门"),
            new AreaCity("440000", "广东省", "440800", "湛江"),
            new AreaCity("440000", "广东省", "441200", "肇庆"),
            new AreaCity("440000", "广东省", "441300", "惠州"),
            new AreaCity("440000", "广东省", "441700", "阳江"),
            new AreaCity("440000", "广东省", "441800", "清远"),
            new AreaCity("440000", "广东省", "441900", "东莞"),
            new AreaCity("440000", "广东省", "442000", "中山"),
            new AreaCity("810000", "香港", "810100", "香港岛"),
            new AreaCity("810000", "香港", "810200", "九龙"),
            new AreaCity("810000", "香港", "810300", "新界"),
            new AreaCity("820000", "澳门", "820100", "澳门半岛"),
            new AreaCity("820000", "澳门", "820200", "离岛"));

    private static final Map<String, AreaCity> BY_CITY_CODE = CITIES.stream()
            .collect(Collectors.toUnmodifiableMap(AreaCity::cityCode, Function.identity()));

    private AreaConstant() {
    }

    /**
     * 按 6 位代码查二级节点。
     *
     * @param code 请求中的目的地代码
     * @return 市级节点；省级代码、格式非法或字典中不存在时为空
     */
    public static Optional<AreaCity> cityOf(String code) {
        if (code == null) {
            return Optional.empty();
        }
        String trimmed = code.trim();
        if (trimmed.length() != CODE_LENGTH || trimmed.endsWith(PROVINCE_LEVEL_SUFFIX)) {
            return Optional.empty();
        }
        return Optional.ofNullable(BY_CITY_CODE.get(trimmed));
    }

    public static List<AreaCity> cities() {
        return CITIES;
    }
}