package routeme.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import routeme.pojo.WeatherForecast;
import routeme.service.DemoUserService;
import routeme.service.WeatherService;

/**
 * 天气预览端点：生成前右栏天气卡与单独 Retry 使用。
 *
 * <p>AI 生成（{@code /api/ai/itineraries/generate}）内的天气由后端自取注入，
 * 以 generate 响应为权威；本端点只做预览，两者口径一致（L-02）。
 */
@RestController
@RequestMapping("/api/weather")
public class WeatherController {

    private final WeatherService weatherService;
    private final DemoUserService demoUserService;

    public WeatherController(WeatherService weatherService, DemoUserService demoUserService) {
        this.weatherService = weatherService;
        this.demoUserService = demoUserService;
    }

    @GetMapping("/forecast")
    public WeatherForecast forecast(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestParam double lng,
            @RequestParam double lat,
            @RequestParam String date) {
        demoUserService.require(userId);
        return weatherService.forecast(lng, lat, date);
    }
}