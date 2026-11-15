package routeme.service;

import java.util.List;

import org.springframework.stereotype.Service;

import routeme.exception.DemoUserRequiredException;
import routeme.model.DemoUser;
import routeme.repository.UserRepository;

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
            throw new DemoUserRequiredException("missing X-User-Id header");
        }
        return userRepository.findById(userId)
                .orElseThrow(() -> new DemoUserRequiredException("unknown demo user: " + userId));
    }
}