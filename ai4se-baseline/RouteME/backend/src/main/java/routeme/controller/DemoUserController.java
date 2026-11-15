package routeme.controller;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import routeme.dto.DemoUserResponse;
import routeme.service.DemoUserService;

@RestController
@RequestMapping("/api/users")
public class DemoUserController {

    private final DemoUserService demoUserService;

    public DemoUserController(DemoUserService demoUserService) {
        this.demoUserService = demoUserService;
    }

    @GetMapping
    public List<DemoUserResponse> list() {
        return demoUserService.findAll().stream().map(DemoUserResponse::from).toList();
    }
}