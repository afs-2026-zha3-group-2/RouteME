package routeme.enums;

import routeme.exception.InvalidInputException;

/**
 * Account role stored in {@code app_users.role}. Wire values are uppercase (design D16).
 */
public enum AccountRoleEnum {
    USER("USER"),
    ADMIN("ADMIN");

    private final String code;

    AccountRoleEnum(String code) {
        this.code = code;
    }

    public String code() {
        return code;
    }

    public static AccountRoleEnum of(String value) {
        for (AccountRoleEnum candidate : values()) {
            if (candidate.code.equals(value)) {
                return candidate;
            }
        }
        throw new InvalidInputException("unknown account role: " + value);
    }
}