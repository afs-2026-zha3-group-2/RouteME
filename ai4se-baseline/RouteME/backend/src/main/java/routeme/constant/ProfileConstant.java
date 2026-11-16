package routeme.constant;

import java.util.List;
import java.util.Map;

/**
 * 个人资料的边界值：字段长度、枚举与头像限制，与契约 UserProfileUpdateRequest 同值。
 */
public final class ProfileConstant {

    public static final int MAX_NICKNAME_LENGTH = 20;
    public static final int MAX_CITY_LENGTH = 40;
    public static final int MAX_SCHOOL_LENGTH = 80;
    public static final int MAX_MAJOR_LENGTH = 80;
    public static final int MAX_BIO_LENGTH = 500;
    public static final int MIN_INTERESTS = 3;
    public static final int MAX_INTERESTS = 5;
    public static final int MAX_INTEREST_LENGTH = 12;

    /** 生日下限：早于该日期视为超出范围。 */
    public static final String EARLIEST_BIRTHDAY = "1900-01-01";

    public static final List<String> GENDERS = List.of("男", "女", "其他");
    public static final List<String> JOBS = List.of("学生", "上班族", "自由职业", "其他");
    public static final List<String> TRAVEL_STYLES = List.of("特种兵", "休闲游", "深度游", "随性游");
    public static final List<String> MBTI_TYPES = List.of(
            "INTJ", "INTP", "ENTJ", "ENTP",
            "INFJ", "INFP", "ENFJ", "ENFP",
            "ISTJ", "ISFJ", "ESTJ", "ESFJ",
            "ISTP", "ISFP", "ESTP", "ESFP");

    /** 头像业务上限：2 MB。Spring multipart 上限在 application.yaml 同步设置。 */
    public static final long MAX_AVATAR_BYTES = 2L * 1024 * 1024;
    public static final String AVATAR_JPEG = "jpg";
    public static final String AVATAR_PNG = "png";
    public static final String AVATAR_WEBP = "webp";
    public static final Map<String, String> AVATAR_CONTENT_TYPES = Map.of(
            AVATAR_JPEG, "image/jpeg",
            AVATAR_PNG, "image/png",
            AVATAR_WEBP, "image/webp");

    /** 校验失败的原因码，前端按原值映射中文文案。 */
    public static final String REASON_REQUIRED = "REQUIRED";
    public static final String REASON_TOO_LONG = "TOO_LONG";
    public static final String REASON_INVALID_DATE = "INVALID_DATE";
    public static final String REASON_OUT_OF_RANGE = "OUT_OF_RANGE";
    public static final String REASON_TOO_FEW = "TOO_FEW";
    public static final String REASON_TOO_MANY = "TOO_MANY";
    public static final String REASON_DUPLICATE = "DUPLICATE";
    public static final String REASON_INVALID_OPTION = "INVALID_OPTION";

    private ProfileConstant() {
    }
}