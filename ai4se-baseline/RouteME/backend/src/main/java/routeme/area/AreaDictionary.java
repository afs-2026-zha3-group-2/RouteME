package routeme.area;

import java.io.IOException;
import java.io.InputStream;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import tools.jackson.databind.ObjectMapper;

import routeme.exception.InvalidInputException;

/**
 * 全国省市二级行政区划字典。数据由 frontend/scripts/generate-area-codes.cjs
 * 从 element-china-area-data@5 生成，前后端同源。
 */
@Component
public class AreaDictionary {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final Map<String, AreaCity> cities;
    private final Map<String, AreaProvince> provinces;

    public AreaDictionary() {
        Root root = load();
        Map<String, AreaProvince> provinceMap = new LinkedHashMap<>();
        Map<String, AreaCity> cityMap = new LinkedHashMap<>();
        for (ProvinceNode province : root.provinces()) {
            AreaProvince areaProvince = new AreaProvince(province.code(), province.name(), province.displayName());
            if (provinceMap.put(province.code(), areaProvince) != null) {
                throw new IllegalStateException("duplicate province code: " + province.code());
            }
            for (CityNode city : province.cities()) {
                AreaCity areaCity = new AreaCity(
                        city.code(),
                        city.name(),
                        city.displayName(),
                        province.code(),
                        province.name(),
                        province.displayName());
                if (cityMap.put(city.code(), areaCity) != null) {
                    throw new IllegalStateException("duplicate city code: " + city.code());
                }
            }
        }
        this.provinces = Map.copyOf(provinceMap);
        this.cities = Map.copyOf(cityMap);
    }

    public boolean isValidCityCode(String code) {
        return code != null && cities.containsKey(code);
    }

    public Optional<AreaCity> findCity(String code) {
        return code == null ? Optional.empty() : Optional.ofNullable(cities.get(code));
    }

    public AreaCity requireCity(String code) {
        return findCity(code)
                .orElseThrow(() -> new InvalidInputException("destination_code is not a supported city"));
    }

    public String displayNameOf(String code) {
        return requireCity(code).displayName();
    }

    public String provinceDisplayNameOf(String code) {
        return requireCity(code).provinceDisplayName();
    }

    public Map<String, AreaProvince> provinces() {
        return provinces;
    }

    public Map<String, AreaCity> cities() {
        return cities;
    }

    private Root load() {
        ClassPathResource resource = new ClassPathResource("area/area-codes.json");
        try (InputStream input = resource.getInputStream()) {
            return MAPPER.readValue(input, Root.class);
        } catch (IOException error) {
            throw new IllegalStateException("failed to load area/area-codes.json", error);
        }
    }

    public record AreaProvince(String code, String name, String displayName) {
    }

    public record AreaCity(
            String code,
            String name,
            String displayName,
            String provinceCode,
            String provinceName,
            String provinceDisplayName) {
    }

    private record Root(List<ProvinceNode> provinces) {
    }

    private record ProvinceNode(String code, String name, String displayName, List<CityNode> cities) {
    }

    private record CityNode(String code, String name, String displayName) {
    }
}
