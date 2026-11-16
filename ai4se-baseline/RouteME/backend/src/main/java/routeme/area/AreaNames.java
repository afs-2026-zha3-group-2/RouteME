package routeme.area;

import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.core.io.ClassPathResource;

import tools.jackson.databind.ObjectMapper;

/**
 * 区划名称的静态查询，供响应层派生省名/城市标准名，避免每个调用方都注入字典。
 * 数据与 {@link AreaDictionary} 同源（area/area-codes.json）。
 */
public final class AreaNames {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final Map<String, String> CITY_DISPLAY = new HashMap<>();
    private static final Map<String, String> PROVINCE_DISPLAY = new HashMap<>();

    static {
        Root root = load();
        for (ProvinceNode province : root.provinces()) {
            PROVINCE_DISPLAY.put(province.code(), province.displayName());
            for (CityNode city : province.cities()) {
                CITY_DISPLAY.put(city.code(), city.displayName());
            }
        }
    }

    private AreaNames() {
    }

    public static boolean isValidCityCode(String code) {
        return code != null && CITY_DISPLAY.containsKey(code);
    }

    public static String cityDisplayNameOf(String code) {
        return code == null ? "" : CITY_DISPLAY.getOrDefault(code, "");
    }

    public static String provinceCodeOf(String cityCode) {
        if (cityCode == null || cityCode.length() < 2) {
            return "";
        }
        return cityCode.substring(0, 2) + "0000";
    }

    public static String provinceDisplayNameOf(String cityCode) {
        return PROVINCE_DISPLAY.getOrDefault(provinceCodeOf(cityCode), "");
    }

    private static Root load() {
        ClassPathResource resource = new ClassPathResource("area/area-codes.json");
        try (InputStream input = resource.getInputStream()) {
            return MAPPER.readValue(input, Root.class);
        } catch (IOException error) {
            throw new ExceptionInInitializerError(error);
        }
    }

    private record Root(List<ProvinceNode> provinces) {
    }

    private record ProvinceNode(String code, String name, String displayName, List<CityNode> cities) {
    }

    private record CityNode(String code, String name, String displayName) {
    }
}
