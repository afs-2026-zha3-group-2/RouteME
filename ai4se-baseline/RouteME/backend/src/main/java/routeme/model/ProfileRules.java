package routeme.model;

import static routeme.constant.ProfileConstant.EARLIEST_BIRTHDAY;

import java.time.Clock;
import java.time.LocalDate;
import java.time.Period;
import java.time.format.DateTimeParseException;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import routeme.constant.ProfileConstant;
import routeme.request.UserProfileUpdateRequest;

/**
 * 资料派生规则：年龄、星座、完善状态、发布者摘要与头像类型嗅探。
 *
 * <p>完善状态不落库，读时由必填字段派生；NULL / 空串 / 空白 / 非法日期都算缺失。</p>
 */
public final class ProfileRules {

    private static final String[] ZODIAC_NAMES = {
            "摩羯", "水瓶", "双鱼", "白羊", "金牛", "双子",
            "巨蟹", "狮子", "处女", "天秤", "天蝎", "射手"
    };

    /** 各星座起始月日，索引与 {@link #ZODIAC_NAMES} 对齐；索引 0 的摩羯跨年，单独判断。 */
    private static final int[][] ZODIAC_STARTS = {
            {12, 22}, {1, 20}, {2, 19}, {3, 21}, {4, 20}, {5, 21}, {6, 22},
            {7, 23}, {8, 23}, {9, 23}, {10, 24}, {11, 23}
    };

    private ProfileRules() {
    }

    /**
     * 周岁年龄；生日缺失或无法解析时为空。
     *
     * @param birthday {@code YYYY-MM-DD}，可为 null
     * @param clock    当前时钟（测试可注入固定时刻）
     * @return 周岁；无法派生时为空
     */
    public static Integer age(String birthday, Clock clock) {
        LocalDate date = parseDate(birthday);
        if (date == null) {
            return null;
        }
        return Period.between(date, LocalDate.now(clock)).getYears();
    }

    /**
     * 星座；生日缺失或无法解析时为空。
     *
     * @param birthday {@code YYYY-MM-DD}，可为 null
     * @return 星座名（摩羯 / 水瓶 … / 射手）；无法派生时为空
     */
    public static String zodiac(String birthday) {
        LocalDate date = parseDate(birthday);
        if (date == null) {
            return null;
        }
        int month = date.getMonthValue();
        int day = date.getDayOfMonth();
        if (month == 12 && day >= ZODIAC_STARTS[0][1]) {
            return ZODIAC_NAMES[0];
        }
        int zodiacIndex = 0;
        for (int index = 1; index < ZODIAC_STARTS.length; index++) {
            int[] start = ZODIAC_STARTS[index];
            if (month > start[0] || (month == start[0] && day >= start[1])) {
                zodiacIndex = index;
            }
        }
        return ZODIAC_NAMES[zodiacIndex];
    }

    /**
     * 资料是否完善：昵称非空、生日合法、性别为枚举、城市非空、兴趣 3–5 个、旅行方式为枚举。
     *
     * @param nickname    昵称
     * @param birthday    {@code YYYY-MM-DD}
     * @param gender      性别
     * @param city        城市
     * @param interests   兴趣标签
     * @param travelStyle 旅行方式
     * @param clock       当前时钟
     * @return 六项同时成立时为 true
     */
    public static boolean complete(
            String nickname,
            String birthday,
            String gender,
            String city,
            List<String> interests,
            String travelStyle,
            Clock clock) {
        return !trimToEmpty(nickname).isEmpty()
                && isValidBirthday(birthday, clock)
                && ProfileConstant.GENDERS.contains(trimToEmpty(gender))
                && !trimToEmpty(city).isEmpty()
                && interests != null
                && interests.size() >= ProfileConstant.MIN_INTERESTS
                && interests.size() <= ProfileConstant.MAX_INTERESTS
                && ProfileConstant.TRAVEL_STYLES.contains(trimToEmpty(travelStyle));
    }

    /**
     * 发布者摘要：学校（有专业时拼接「学校 · 专业」）→ 职业 → 城市 → 空串。
     */
    public static String summary(String school, String major, String job, String city) {
        String trimmedSchool = trimToEmpty(school);
        if (!trimmedSchool.isEmpty()) {
            String trimmedMajor = trimToEmpty(major);
            return trimmedMajor.isEmpty() ? trimmedSchool : trimmedSchool + " · " + trimmedMajor;
        }
        String trimmedJob = trimToEmpty(job);
        if (!trimmedJob.isEmpty()) {
            return trimmedJob;
        }
        return trimToEmpty(city);
    }

    /**
     * 头像类型嗅探：只看魔数，不信任声明的 Content-Type 与原始文件名。
     *
     * @param content 文件字节
     * @return {@code jpg} / {@code png} / {@code webp}；不在允许范围时为空
     */
    public static String avatarExtension(byte[] content) {
        if (content == null) {
            return null;
        }
        if (content.length >= 3
                && (content[0] & 0xFF) == 0xFF
                && (content[1] & 0xFF) == 0xD8
                && (content[2] & 0xFF) == 0xFF) {
            return ProfileConstant.AVATAR_JPEG;
        }
        if (content.length >= 4
                && (content[0] & 0xFF) == 0x89
                && (content[1] & 0xFF) == 0x50
                && (content[2] & 0xFF) == 0x4E
                && (content[3] & 0xFF) == 0x47) {
            return ProfileConstant.AVATAR_PNG;
        }
        if (content.length >= 12
                && content[0] == 'R'
                && content[1] == 'I'
                && content[2] == 'F'
                && content[3] == 'F'
                && content[8] == 'W'
                && content[9] == 'E'
                && content[10] == 'B'
                && content[11] == 'P') {
            return ProfileConstant.AVATAR_WEBP;
        }
        return null;
    }

    /**
     * 按 §4 校验矩阵逐字段收集原因码；键与请求 JSON 字段名一致。
     *
     * @param request 更新请求，可为 null
     * @param clock   当前时钟
     * @return 字段名 → 原因码；全部合法时为空 map
     */
    public static Map<String, String> validate(UserProfileUpdateRequest request, Clock clock) {
        Map<String, String> fields = new LinkedHashMap<>();
        if (request == null) {
            fields.put("nickname", ProfileConstant.REASON_REQUIRED);
            fields.put("birthday", ProfileConstant.REASON_REQUIRED);
            fields.put("gender", ProfileConstant.REASON_REQUIRED);
            fields.put("city", ProfileConstant.REASON_REQUIRED);
            fields.put("interests", ProfileConstant.REASON_TOO_FEW);
            fields.put("travel_style", ProfileConstant.REASON_REQUIRED);
            return fields;
        }

        String nickname = trimToEmpty(request.nickname());
        if (nickname.isEmpty()) {
            fields.put("nickname", ProfileConstant.REASON_REQUIRED);
        } else if (nickname.length() > ProfileConstant.MAX_NICKNAME_LENGTH) {
            fields.put("nickname", ProfileConstant.REASON_TOO_LONG);
        }

        String birthday = trimToEmpty(request.birthday());
        if (birthday.isEmpty()) {
            fields.put("birthday", ProfileConstant.REASON_REQUIRED);
        } else if (!isValidBirthday(birthday, clock)) {
            LocalDate date = parseDate(birthday);
            fields.put("birthday",
                    date == null ? ProfileConstant.REASON_INVALID_DATE : ProfileConstant.REASON_OUT_OF_RANGE);
        }

        String gender = trimToEmpty(request.gender());
        if (gender.isEmpty()) {
            fields.put("gender", ProfileConstant.REASON_REQUIRED);
        } else if (!ProfileConstant.GENDERS.contains(gender)) {
            fields.put("gender", ProfileConstant.REASON_INVALID_OPTION);
        }

        String city = trimToEmpty(request.city());
        if (city.isEmpty()) {
            fields.put("city", ProfileConstant.REASON_REQUIRED);
        } else if (city.length() > ProfileConstant.MAX_CITY_LENGTH) {
            fields.put("city", ProfileConstant.REASON_TOO_LONG);
        }

        String interestsError = validateInterests(request.interests());
        if (interestsError != null) {
            fields.put("interests", interestsError);
        }

        String travelStyle = trimToEmpty(request.travelStyle());
        if (travelStyle.isEmpty()) {
            fields.put("travel_style", ProfileConstant.REASON_REQUIRED);
        } else if (!ProfileConstant.TRAVEL_STYLES.contains(travelStyle)) {
            fields.put("travel_style", ProfileConstant.REASON_INVALID_OPTION);
        }

        validateOptionalLength(fields, "school", request.school(), ProfileConstant.MAX_SCHOOL_LENGTH);
        validateOptionalLength(fields, "major", request.major(), ProfileConstant.MAX_MAJOR_LENGTH);
        validateOptionalLength(fields, "bio", request.bio(), ProfileConstant.MAX_BIO_LENGTH);

        String job = trimToEmpty(request.job());
        if (!job.isEmpty() && !ProfileConstant.JOBS.contains(job)) {
            fields.put("job", ProfileConstant.REASON_INVALID_OPTION);
        }

        String mbti = trimToEmpty(request.mbti());
        if (!mbti.isEmpty() && !ProfileConstant.MBTI_TYPES.contains(mbti.toUpperCase(Locale.ROOT))) {
            fields.put("mbti", ProfileConstant.REASON_INVALID_OPTION);
        }

        return fields;
    }

    /**
     * 兴趣规范化：去首尾空白、去掉空项并按首次出现去重；调用前需已通过校验。
     */
    public static List<String> normalizeInterests(List<String> values) {
        if (values == null) {
            return List.of();
        }
        Set<String> seen = new HashSet<>();
        return values.stream()
                .map(ProfileRules::trimToEmpty)
                .filter(value -> !value.isEmpty())
                .filter(seen::add)
                .toList();
    }

    /**
     * 生日是否合法：可解析且落在 1900-01-01 与今天之间。
     */
    public static boolean isValidBirthday(String birthday, Clock clock) {
        LocalDate date = parseDate(birthday);
        if (date == null) {
            return false;
        }
        return !date.isBefore(LocalDate.parse(EARLIEST_BIRTHDAY)) && !date.isAfter(LocalDate.now(clock));
    }

    public static String trimToEmpty(String value) {
        return value == null ? "" : value.trim();
    }

    public static String trimToNull(String value) {
        String trimmed = trimToEmpty(value);
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static String validateInterests(List<String> values) {
        if (values == null || values.size() < ProfileConstant.MIN_INTERESTS) {
            return ProfileConstant.REASON_TOO_FEW;
        }
        if (values.size() > ProfileConstant.MAX_INTERESTS) {
            return ProfileConstant.REASON_TOO_MANY;
        }
        Set<String> seen = new HashSet<>();
        for (String value : values) {
            String trimmed = trimToEmpty(value);
            if (trimmed.isEmpty()) {
                return ProfileConstant.REASON_REQUIRED;
            }
            if (trimmed.length() > ProfileConstant.MAX_INTEREST_LENGTH) {
                return ProfileConstant.REASON_TOO_LONG;
            }
            if (!seen.add(trimmed)) {
                return ProfileConstant.REASON_DUPLICATE;
            }
        }
        return null;
    }

    private static void validateOptionalLength(
            Map<String, String> fields, String field, String value, int maxLength) {
        if (trimToEmpty(value).length() > maxLength) {
            fields.put(field, ProfileConstant.REASON_TOO_LONG);
        }
    }

    private static LocalDate parseDate(String value) {
        String trimmed = trimToEmpty(value);
        if (trimmed.length() != 10) {
            return null;
        }
        try {
            return LocalDate.parse(trimmed);
        } catch (DateTimeParseException exception) {
            return null;
        }
    }
}