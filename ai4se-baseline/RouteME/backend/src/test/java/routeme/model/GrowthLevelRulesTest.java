package routeme.model;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

/**
 * 成长等级的区间与满级纯规则。
 */
class GrowthLevelRulesTest {

    @Test
    void in_boundaryExp_out_expectedLevels() {
        assertAll(
                () -> assertEquals(1, GrowthLevelRules.levelOf(0), "0"),
                () -> assertEquals(1, GrowthLevelRules.levelOf(99), "99"),
                () -> assertEquals(2, GrowthLevelRules.levelOf(100), "100"),
                () -> assertEquals(2, GrowthLevelRules.levelOf(199), "199"),
                () -> assertEquals(3, GrowthLevelRules.levelOf(200), "200"),
                () -> assertEquals(3, GrowthLevelRules.levelOf(299), "299"),
                () -> assertEquals(4, GrowthLevelRules.levelOf(300), "300"),
                () -> assertEquals(4, GrowthLevelRules.levelOf(399), "399"),
                () -> assertEquals(5, GrowthLevelRules.levelOf(400), "400"),
                () -> assertEquals(5, GrowthLevelRules.levelOf(450), "450"));
    }

    @Test
    void in_expToNext_out_remainingOrNullAtMax() {
        assertAll(
                () -> assertEquals(100, GrowthLevelRules.expToNext(0), "0"),
                () -> assertEquals(1, GrowthLevelRules.expToNext(99), "99"),
                () -> assertEquals(100, GrowthLevelRules.expToNext(100), "100"),
                () -> assertEquals(60, GrowthLevelRules.expToNext(240), "240"),
                () -> assertEquals(1, GrowthLevelRules.expToNext(399), "399"),
                () -> assertNull(GrowthLevelRules.expToNext(400), "400"),
                () -> assertNull(GrowthLevelRules.expToNext(450), "450"));
    }

    @Test
    void in_maxLevelBoundary_out_flag() {
        assertAll(
                () -> assertFalse(GrowthLevelRules.maxLevel(399), "399 is not max"),
                () -> assertTrue(GrowthLevelRules.maxLevel(400), "400 is max"));
    }
}
