package routeme.service;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import routeme.pojo.Greeting;

@SpringBootTest
@Transactional
class GreetingServiceTest {

    @Autowired
    private GreetingService greetingService;

    @Test
    void in_seededGreeting_out_greetingReturned() {
        // When
        Greeting greeting = greetingService.loadGreeting();

        // Then
        assertAll(
                () -> assertEquals(1, greeting.id(), "id"),
                () -> assertEquals("Hello World", greeting.message(), "message")
        );
    }
}