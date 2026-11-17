package routeme.enums;

import routeme.exception.InvalidInputException;

/**
 * Report processing status stored in {@code reports.status}. Wire values are uppercase (design D16).
 */
public enum ReportStatusEnum {
    PENDING("PENDING"),
    PROCESSING("PROCESSING"),
    RESOLVED("RESOLVED"),
    REJECTED("REJECTED");

    private final String code;

    ReportStatusEnum(String code) {
        this.code = code;
    }

    public String code() {
        return code;
    }

    public static ReportStatusEnum of(String value) {
        for (ReportStatusEnum candidate : values()) {
            if (candidate.code.equals(value)) {
                return candidate;
            }
        }
        throw new InvalidInputException("unknown report status: " + value);
    }
}