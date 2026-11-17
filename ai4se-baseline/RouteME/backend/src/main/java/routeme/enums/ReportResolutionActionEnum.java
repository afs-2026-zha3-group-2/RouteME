package routeme.enums;

import routeme.exception.InvalidInputException;

/**
 * Action recorded in {@code reports.resolution_action}. Wire values are uppercase (design D16).
 */
public enum ReportResolutionActionEnum {
    SUSPEND("SUSPEND"),
    BAN("BAN"),
    KEEP("KEEP"),
    UPDATE_BAN("UPDATE_BAN"),
    REJECT("REJECT");

    private final String code;

    ReportResolutionActionEnum(String code) {
        this.code = code;
    }

    public String code() {
        return code;
    }

    public static ReportResolutionActionEnum of(String value) {
        for (ReportResolutionActionEnum candidate : values()) {
            if (candidate.code.equals(value)) {
                return candidate;
            }
        }
        throw new InvalidInputException("unknown report resolution action: " + value);
    }
}