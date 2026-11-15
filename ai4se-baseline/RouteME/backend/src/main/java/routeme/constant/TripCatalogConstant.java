package routeme.constant;

import java.util.List;

/**
 * 行程的固定候选与边界值：V4 种子、契约枚举与前后端校验共用同一组定义。
 */
public final class TripCatalogConstant {

    public static final List<String> DESTINATIONS =
            List.of("珠海", "广州", "深圳", "佛山", "清远", "中山", "江门", "肇庆");

    public static final int MAX_TITLE_LENGTH = 40;
    public static final int MIN_STOPS = 2;
    public static final int MIN_CAPACITY = 2;
    public static final int MAX_CAPACITY = 12;
    public static final int MAX_TAGS = 5;
    public static final int MAX_MEETING_AREA_LENGTH = 100;
    public static final int MAX_NOTE_LENGTH = 500;

    private TripCatalogConstant() {
    }
}