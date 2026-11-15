package routeme.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import routeme.response.GreetingResponse;
import routeme.model.Greeting;
import routeme.service.GreetingService;

@RestController
public class GreetingController {

    private final GreetingService greetingService;

    public GreetingController(GreetingService greetingService) {
        this.greetingService = greetingService;
    }

    @GetMapping("/api/greeting")
    public GreetingResponse loadGreeting() {
        Greeting greeting = greetingService.loadGreeting();
        return new GreetingResponse(greeting.id(), greeting.message());
    }
}
