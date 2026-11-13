package routeme.exception;

public class GreetingNotFound extends RuntimeException {

    public GreetingNotFound() {
        super("greetings table has no record");
    }
}
