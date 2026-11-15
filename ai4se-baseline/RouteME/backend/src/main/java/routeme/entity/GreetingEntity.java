package routeme.entity;

import routeme.model.Greeting;

public record GreetingEntity(long id, String message) {

    public Greeting toGreeting() {
        return new Greeting(id, message);
    }
}
