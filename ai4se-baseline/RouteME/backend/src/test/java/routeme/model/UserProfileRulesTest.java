package routeme.model;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.stream.Stream;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

/**
 * 资料派生规则单测：星座边界、周岁、完善状态、发布者摘要与头像魔数。
 */
class UserProfileRulesTest {

    private static final Clock FIXED_CLOCK =
            Clock.fixed(Instant.parse("2026-06-01T00:00:00Z"), ZoneOffset.UTC);

    @ParameterizedTest(name = "{0} -> {1}")
    @MethodSource("zodiacBoundaries")
    void in_birthdayOnZodiacBoundary_out_expectedSign(String birthday, String expectedSign) {
        assertEquals(expectedSign, ProfileRules.zodiac(birthday));
    }

    private static Stream<Arguments> zodiacBoundaries() {
        return Stream.of(
                Arguments.of("2000-12-22", "摩羯"),
                Arguments.of("2000-01-20", "水瓶"),
                Arguments.of("2000-02-19", "双鱼"),
                Arguments.of("2000-03-21", "白羊"),
                Arguments.of("2000-04-20", "金牛"),
                Arguments.of("2000-05-21", "双子"),
                Arguments.of("2000-06-22", "巨蟹"),
                Arguments.of("2000-07-23", "狮子"),
                Arguments.of("2000-08-23", "处女"),
                Arguments.of("2000-09-23", "天秤"),
                Arguments.of("2000-10-24", "天蝎"),
                Arguments.of("2000-11-23", "射手"));
    }

    @Test
    void in_birthdayBeforeBirthdayInYear_out_ageMinusOne() {
        assertAll(
                () -> assertEquals(Integer.valueOf(22), ProfileRules.age("2003-06-02", FIXED_CLOCK), "birthday not reached"),
                () -> assertEquals(Integer.valueOf(23), ProfileRules.age("2003-06-01", FIXED_CLOCK), "birthday today"),
                () -> assertEquals(Integer.valueOf(23), ProfileRules.age("2003-05-18", FIXED_CLOCK), "birthday passed"),
                () -> assertNull(ProfileRules.age("2003-13-40", FIXED_CLOCK), "malformed birthday"),
                () -> assertNull(ProfileRules.age(null, FIXED_CLOCK), "missing birthday"),
                () -> assertNull(ProfileRules.zodiac("not-a-date"), "malformed zodiac"));
    }

    @Test
    void in_profileWithAllRequired_out_complete() {
        assertTrue(ProfileRules.complete(
                "小夏", "2003-05-18", "女", "珠海", List.of("摄影", "美食", "徒步"), "休闲游", FIXED_CLOCK));
    }

    @Test
    void in_profileMissingOneRequired_out_incomplete() {
        assertAll(
                () -> assertFalse(ProfileRules.complete(
                        " ", "2003-05-18", "女", "珠海", List.of("摄影", "美食", "徒步"), "休闲游", FIXED_CLOCK),
                        "blank nickname"),
                () -> assertFalse(ProfileRules.complete(
                        "小夏", "", "女", "珠海", List.of("摄影", "美食", "徒步"), "休闲游", FIXED_CLOCK),
                        "empty birthday"),
                () -> assertFalse(ProfileRules.complete(
                        "小夏", "2003-05-18", "未知", "珠海", List.of("摄影", "美食", "徒步"), "休闲游", FIXED_CLOCK),
                        "unknown gender"),
                () -> assertFalse(ProfileRules.complete(
                        "小夏", "2003-05-18", "女", "珠海", List.of("摄影", "美食"), "休闲游", FIXED_CLOCK),
                        "two interests"),
                () -> assertFalse(ProfileRules.complete(
                        "小夏", "2003-05-18", "女", "珠海", List.of("摄影", "美食", "徒步"), "跟团游", FIXED_CLOCK),
                        "unknown travel style"),
                () -> assertFalse(ProfileRules.complete(
                        "小夏", "2099-01-01", "女", "珠海", List.of("摄影", "美食", "徒步"), "休闲游", FIXED_CLOCK),
                        "future birthday"),
                () -> assertFalse(ProfileRules.complete(
                        "小夏", null, "女", null, List.of("摄影", "美食", "徒步"), null, FIXED_CLOCK),
                        "null legacy columns"),
                () -> assertFalse(ProfileRules.complete(
                        "小夏", "2003-05-18", "女", "珠海",
                        List.of("摄影", "美食", "徒步", "露营", "夜景", "音乐"), "休闲游", FIXED_CLOCK),
                        "too many interests"));
    }

    @Test
    void in_publisherWithSchoolAndMajor_out_joined() {
        assertEquals("中山大学 · 地理科学", ProfileRules.summary("中山大学", "地理科学", "学生", "珠海"));
    }

    @Test
    void in_publisherWithoutSchool_out_job() {
        assertAll(
                () -> assertEquals("上班族", ProfileRules.summary("", "地理科学", "上班族", "珠海")),
                () -> assertEquals("上班族", ProfileRules.summary(null, null, "上班族", "珠海")));
    }

    @Test
    void in_publisherWithoutSchoolAndJob_out_city() {
        assertEquals("珠海", ProfileRules.summary(" ", "", "", "珠海"));
    }

    @Test
    void in_publisherWithoutAny_out_empty() {
        assertEquals("", ProfileRules.summary(null, null, null, null));
        assertEquals("", ProfileRules.summary("", "", "", " "));
    }

    @Test
    void in_avatarPngOrJpegOrWebp_out_accepted() {
        assertAll(
                () -> assertEquals("jpg", ProfileRules.avatarExtension(new byte[] {
                        (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 0x10})),
                () -> assertEquals("png", ProfileRules.avatarExtension(new byte[] {
                        (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A})),
                () -> assertEquals("webp", ProfileRules.avatarExtension(
                        "RIFF0000WEBPVP8 ".getBytes(java.nio.charset.StandardCharsets.US_ASCII))));
    }

    @Test
    void in_avatarGifOrText_out_rejected() {
        assertAll(
                () -> assertNull(ProfileRules.avatarExtension(
                        "GIF89a".getBytes(java.nio.charset.StandardCharsets.US_ASCII))),
                () -> assertNull(ProfileRules.avatarExtension(
                        "not an image".getBytes(java.nio.charset.StandardCharsets.US_ASCII))),
                () -> assertNull(ProfileRules.avatarExtension(new byte[0])),
                () -> assertNull(ProfileRules.avatarExtension(null)));
    }

    @Test
    void in_interestsWithDuplicates_out_duplicateReason() {
        assertAll(
                () -> assertEquals("DUPLICATE", validateInterests(List.of("摄影", " 摄影 ", "美食"))),
                () -> assertEquals("TOO_FEW", validateInterests(List.of("摄影", "美食"))),
                () -> assertEquals("TOO_MANY", validateInterests(List.of("一", "二", "三", "四", "五", "六"))),
                () -> assertEquals("TOO_LONG", validateInterests(List.of("摄影", "美食", "字".repeat(13)))),
                () -> assertEquals("REQUIRED", validateInterests(List.of("摄影", "美食", " "))),
                () -> assertNull(validateInterests(List.of("摄影", "美食", "徒步"))));
    }

    @Test
    void in_birthdayOutOfRange_out_reason() {
        assertEquals("OUT_OF_RANGE", ProfileRules.validate(
                        updateRequest("1899-12-31", "女", "珠海", List.of("摄影", "美食", "徒步"), "休闲游"), FIXED_CLOCK)
                .get("birthday"));
        assertEquals("INVALID_DATE", ProfileRules.validate(
                        updateRequest("2003-02-30", "女", "珠海", List.of("摄影", "美食", "徒步"), "休闲游"), FIXED_CLOCK)
                .get("birthday"));
        assertEquals("REQUIRED", ProfileRules.validate(
                        updateRequest(""), FIXED_CLOCK).get("nickname"));
        assertTrue(ProfileRules.validate(
                        updateRequest("2003-05-18", "女", "珠海", List.of("摄影", "美食", "徒步"), "休闲游"), FIXED_CLOCK)
                .isEmpty());
    }

    private static String validateInterests(List<String> interests) {
        return ProfileRules.validate(new routeme.request.UserProfileUpdateRequest(
                        "小夏", "2003-05-18", "女", "珠海", "", "", "", "", interests, "休闲游", ""),
                FIXED_CLOCK)
                .get("interests");
    }

    private static routeme.request.UserProfileUpdateRequest updateRequest(
            String birthday, String gender, String city, List<String> interests, String travelStyle) {
        return new routeme.request.UserProfileUpdateRequest(
                "小夏", birthday, gender, city, "", "", "", "", interests, travelStyle, "");
    }

    private static routeme.request.UserProfileUpdateRequest updateRequest(String birthday) {
        return new routeme.request.UserProfileUpdateRequest(
                "", birthday, "", "", "", "", "", "", List.of(), "", "学生");
    }

    @Test
    void in_earliestBirthday_out_valid() {
        assertTrue(ProfileRules.isValidBirthday("1900-01-01", FIXED_CLOCK));
        assertFalse(ProfileRules.isValidBirthday("1899-12-31", FIXED_CLOCK));
        assertTrue(ProfileRules.isValidBirthday(LocalDate.now(FIXED_CLOCK).toString(), FIXED_CLOCK));
    }
}