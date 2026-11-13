package routeme.dao;

import routeme.model.Greeting;

record GreetingRow(long id, String message) {

    Greeting toGreeting() {
        return new Greeting(id, message);
    }
}
