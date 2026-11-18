package routeme.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import routeme.service.AdminPrincipalService;
import routeme.service.ExperienceService;

/** 管理端旅行灵感内容治理：管理员可删除任意一条游后体验。 */
@RestController
@RequestMapping("/api/admin/experiences")
public class AdminExperienceController {

    private final AdminPrincipalService adminPrincipalService;
    private final ExperienceService experienceService;

    public AdminExperienceController(
            AdminPrincipalService adminPrincipalService, ExperienceService experienceService) {
        this.adminPrincipalService = adminPrincipalService;
        this.experienceService = experienceService;
    }

    @DeleteMapping("/{experienceId}")
    public ResponseEntity<Void> delete(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable long experienceId) {
        adminPrincipalService.requireAdmin(authorization);
        experienceService.delete(experienceId);
        return ResponseEntity.noContent().build();
    }
}
