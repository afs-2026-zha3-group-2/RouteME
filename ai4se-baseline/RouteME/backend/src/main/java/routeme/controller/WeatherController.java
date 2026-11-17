package routeme.controller;

import java.time.LocalDate;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import routeme.param.WeatherQuery;
import routeme.pojo.WeatherForecast;
import routeme.service.WeatherService;

/**
 * 目的地天气接口：按区划码与日期返回 Open-Meteo 真实天气与出行提醒。
 *
 * <p>日期超出预报窗口返回 200 + {@code available=false}，属于正常业务状态；
 * 参数非法返回 400，上游不可用返回 502。</p>
 */
@RestController
@RequestMapping("/api/weather")
public class WeatherController {

    private final WeatherService weatherService;

    public WeatherController(WeatherService weatherService) {
        this.weatherService = weatherService;
    }

    @GetMapping("/forecast")
    public WeatherForecast forecast(
            @RequestParam(name = "destination_code", required = false) String destinationCode,
            @RequestParam(name = "date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(name = "lng", required = false) Double lng,
            @RequestParam(name = "lat", required = false) Double lat) {
        return weatherService.forecast(new WeatherQuery(destinationCode, date, lng, lat));
    }
}