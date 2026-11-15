package routeme.service;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.Optional;

import org.junit.jupiter.api.Test;

import routeme.exception.GreetingNotFoundException;
import routeme.model.Greeting;
import routeme.repository.GreetingRepository;

class GreetingServiceTest {

    @Test
    void in_existingGreeting_out_greetingReturned() {
        // Given
        GreetingRepository greetingRepository = () -> Optional.of(new Greeting(1, "Hello World"));

        // When
        Greeting greeting = new GreetingService(greetingRepository).loadGreeting();

        // Then
        assertAll(
                () -> assertEquals(1, greeting.id(), "id"),
                () -> assertEquals("Hello World", greeting.message(), "message")
        );
    }

    @Test
    void in_missingGreeting_out_greetingNotFound() {
        // Given
        GreetingRepository greetingRepository = Optional::empty;

        // When
        GreetingService greetingService = new GreetingService(greetingRepository);

        // Then
        assertThrows(GreetingNotFoundException.class, greetingService::loadGreeting);
    }
}
