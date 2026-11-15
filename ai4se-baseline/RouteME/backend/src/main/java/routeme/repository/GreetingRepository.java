package routeme.repository;

import java.util.Optional;

import routeme.model.Greeting;

public interface GreetingRepository {

    Optional<Greeting> findGreeting();
}
