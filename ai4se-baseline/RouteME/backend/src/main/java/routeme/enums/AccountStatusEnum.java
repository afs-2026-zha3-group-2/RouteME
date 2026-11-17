package routeme.enums;

import routeme.exception.InvalidInputException;

/**
 * Account status stored in {@code app_users.status}. Wire values are uppercase (design D16).
 */
public enum AccountStatusEnum {
    ACTIVE("ACTIVE"),
    SUSPENDED("SUSPENDED"),
    BANNED("BANNED");

    private final String code;

    AccountStatusEnum(String code) {
        this.code = code;
    }

    public String code() {
        return code;
    }

    public static AccountStatusEnum of(String value) {
        for (AccountStatusEnum candidate : values()) {
            if (candidate.code.equals(value)) {
                return candidate;
            }
        }
        throw new InvalidInputException("unknown account status: " + value);
    }
}