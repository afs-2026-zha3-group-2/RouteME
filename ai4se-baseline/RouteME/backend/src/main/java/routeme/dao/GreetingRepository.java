package routeme.dao;

import java.util.Optional;
import routeme.model.Greeting;

public interface GreetingRepository {

    Optional<Greeting> findGreeting();
}
