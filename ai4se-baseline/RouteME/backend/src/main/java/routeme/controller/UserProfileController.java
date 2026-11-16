package routeme.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import routeme.response.UserProfileResponse;
import routeme.service.UserProfileService;

/**
 * 公开资料读取：不要求 X-User-Id 或登录会话，响应由白名单字段组成。
 */
@RestController
@RequestMapping("/api/users")
public class UserProfileController {

    private final UserProfileService userProfileService;

    public UserProfileController(UserProfileService userProfileService) {
        this.userProfileService = userProfileService;
    }

    @GetMapping("/{id}/profile")
    public UserProfileResponse profile(@PathVariable long id) {
        return userProfileService.byUserId(id);
    }
}
