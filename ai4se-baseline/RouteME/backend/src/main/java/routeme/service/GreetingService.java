package routeme.service;

import org.springframework.stereotype.Service;

import routeme.exception.GreetingNotFoundException;
import routeme.model.Greeting;
import routeme.repository.GreetingRepository;

@Service
public class GreetingService {

    private final GreetingRepository greetingRepository;

    public GreetingService(GreetingRepository greetingRepository) {
        this.greetingRepository = greetingRepository;
    }

    public Greeting loadGreeting() {
        return greetingRepository.findGreeting().orElseThrow(GreetingNotFoundException::new);
    }
}
