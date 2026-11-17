package routeme.enums;

import routeme.exception.InvalidInputException;

/**
 * Ban reason stored in {@code app_users.ban_reason_code}. Wire values are uppercase (design D16).
 */
public enum BanReasonEnum {
    HARASSMENT("HARASSMENT"),
    FAKE_TRIP("FAKE_TRIP"),
    FRAUD_RISK("FRAUD_RISK"),
    ILLEGAL_CONTENT("ILLEGAL_CONTENT"),
    IMPERSONATION("IMPERSONATION"),
    NO_SHOW_DISRUPTION("NO_SHOW_DISRUPTION"),
    PRIVACY_LEAK("PRIVACY_LEAK"),
    OTHER("OTHER");

    private final String code;

    BanReasonEnum(String code) {
        this.code = code;
    }

    public String code() {
        return code;
    }

    public static BanReasonEnum of(String value) {
        for (BanReasonEnum candidate : values()) {
            if (candidate.code.equals(value)) {
                return candidate;
            }
        }
        throw new InvalidInputException("unknown ban reason: " + value);
    }
}