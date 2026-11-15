package routeme.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import routeme.response.MyTripsResponse;
import routeme.model.DemoUser;
import routeme.service.DemoUserService;
import routeme.service.MyTripsService;

@RestController
@RequestMapping("/api")
public class MyTripsController {

    private final DemoUserService demoUserService;
    private final MyTripsService myTripsService;

    public MyTripsController(DemoUserService demoUserService, MyTripsService myTripsService) {
        this.demoUserService = demoUserService;
        this.myTripsService = myTripsService;
    }

    @GetMapping("/me/trips")
    public MyTripsResponse mine(@RequestHeader(value = "X-User-Id", required = false) Long userId) {
        DemoUser user = demoUserService.require(userId);
        return myTripsService.forUser(user.id());
    }
}