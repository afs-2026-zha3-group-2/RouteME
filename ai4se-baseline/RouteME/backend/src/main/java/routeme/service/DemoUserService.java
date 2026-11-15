package routeme.service;

import java.util.List;
import org.springframework.stereotype.Service;
import routeme.dao.UserRepository;
import routeme.exception.DemoUserRequired;
import routeme.model.DemoUser;

@Service
public class DemoUserService {

    private final UserRepository userRepository;

    public DemoUserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public List<DemoUser> findAll() {
        return userRepository.findAll();
    }

    public DemoUser require(Long userId) {
        if (userId == null) {
            throw new DemoUserRequired("missing X-User-Id header");
        }
        return userRepository.findById(userId)
                .orElseThrow(() -> new DemoUserRequired("unknown demo user: " + userId));
    }
}