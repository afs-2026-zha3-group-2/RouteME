package routeme.service;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;

import routeme.enums.RouteCompletionState;
import routeme.pojo.RouteCompletion;

class RouteCompletionPolicyTest {

    @Test
    void evaluate_returns_good_at_upper_thresholds() {
        assertAll(
                () -> assertEquals(RouteCompletionState.GOOD, RouteCompletionPolicy.evaluate(80, 1).state()),
                () -> assertEquals(80, RouteCompletionPolicy.evaluate(80, 1).rate()),
                () -> assertEquals(RouteCompletionState.GOOD, RouteCompletionPolicy.evaluate(100, 3).state()));
    }

    @Test
    void evaluate_returns_neutral_between_70_and_79() {
        assertAll(
                () -> assertEquals(RouteCompletionState.NEUTRAL, RouteCompletionPolicy.evaluate(70, 1).state()),
                () -> assertEquals(RouteCompletionState.NEUTRAL, RouteCompletionPolicy.evaluate(79, 2).state()));
    }

    @Test
    void evaluate_returns_watch_below_70() {
        assertAll(
                () -> assertEquals(RouteCompletionState.WATCH, RouteCompletionPolicy.evaluate(69, 1).state()),
                () -> assertEquals(RouteCompletionState.WATCH, RouteCompletionPolicy.evaluate(0, 4).state()));
    }

    @Test
    void evaluate_degrades_illegal_values_to_insufficient() {
        assertAll(
                () -> assertInsuffient(RouteCompletionPolicy.evaluate(-1, 2)),
                () -> assertInsuffient(RouteCompletionPolicy.evaluate(101, 2)),
                () -> assertInsuffient(RouteCompletionPolicy.evaluate(null, 2)));
    }

    @Test
    void evaluate_requires_at_least_one_completed_trip() {
        assertAll(
                () -> assertInsuffient(RouteCompletionPolicy.evaluate(85, 0)),
                () -> assertInsuffient(RouteCompletionPolicy.evaluate(null, 0)));
    }

    private static void assertInsuffient(RouteCompletion completion) {
        assertNull(completion.rate());
        assertEquals(RouteCompletionState.INSUFFICIENT, completion.state());
    }
}
