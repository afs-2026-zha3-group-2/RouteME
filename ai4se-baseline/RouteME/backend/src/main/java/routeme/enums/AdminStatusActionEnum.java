package routeme.enums;

import routeme.exception.InvalidInputException;

/**
 * Action accepted by {@code POST /admin/users/{userId}/status} (design D3).
 */
public enum AdminStatusActionEnum {
    SUSPEND("SUSPEND"),
    BAN("BAN"),
    RESTORE("RESTORE");

    private final String code;

    AdminStatusActionEnum(String code) {
        this.code = code;
    }

    public String code() {
        return code;
    }

    public static AdminStatusActionEnum of(String value) {
        for (AdminStatusActionEnum candidate : values()) {
            if (candidate.code.equals(value)) {
                return candidate;
            }
        }
        throw new InvalidInputException("unknown status action: " + value);
    }
}