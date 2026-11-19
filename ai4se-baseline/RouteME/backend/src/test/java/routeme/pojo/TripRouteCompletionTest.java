package routeme.pojo;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import org.junit.jupiter.api.Test;

import routeme.exception.InvalidInputException;

/**
 * 完成点下标归一化：null 视为全部完成；非法下标（负数、越界、重复、空值）一律拒绝。
 */
class TripRouteCompletionTest {

    @Test
    void in_nullIndexes_out_allStopsCompleted() {
        assertEquals(List.of(0, 1, 2), TripRouteCompletion.cleanIndexes(null, 3));
    }

    @Test
    void in_unsortedIndexes_out_sortedAscending() {
        assertEquals(List.of(0, 2), TripRouteCompletion.cleanIndexes(List.of(2, 0), 3));
    }

    @Test
    void in_emptyIndexes_out_zeroCompleted() {
        assertEquals(List.of(), TripRouteCompletion.cleanIndexes(List.of(), 3));
    }

    @Test
    void in_illegalIndexes_out_invalidInput() {
        assertAll(
                () -> assertThrows(InvalidInputException.class,
                        () -> TripRouteCompletion.cleanIndexes(List.of(-1), 3)),
                () -> assertThrows(InvalidInputException.class,
                        () -> TripRouteCompletion.cleanIndexes(List.of(3), 3)),
                () -> assertThrows(InvalidInputException.class,
                        () -> TripRouteCompletion.cleanIndexes(List.of(0, 0), 3)),
                () -> assertThrows(InvalidInputException.class,
                        () -> TripRouteCompletion.cleanIndexes(Arrays.asList(0, null), 3)),
                () -> assertThrows(InvalidInputException.class,
                        () -> TripRouteCompletion.cleanIndexes(null, 0)));
    }

    @Test
    void in_mutableInput_out_independentCopy() {
        List<Integer> input = new ArrayList<>(List.of(1, 0));
        List<Integer> cleaned = TripRouteCompletion.cleanIndexes(input, 2);
        input.clear();
        assertEquals(List.of(0, 1), cleaned, "cleaned indexes do not alias the caller list");
    }
}