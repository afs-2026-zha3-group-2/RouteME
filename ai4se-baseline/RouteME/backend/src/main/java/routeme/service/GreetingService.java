package routeme.service;

import org.springframework.stereotype.Service;
import routeme.dao.GreetingRepository;
import routeme.exception.GreetingNotFound;
import routeme.model.Greeting;

@Service
public class GreetingService {

    private final GreetingRepository greetingRepository;

    public GreetingService(GreetingRepository greetingRepository) {
        this.greetingRepository = greetingRepository;
    }

    public Greeting loadGreeting() {
        return greetingRepository.findGreeting().orElseThrow(GreetingNotFound::new);
    }
}
