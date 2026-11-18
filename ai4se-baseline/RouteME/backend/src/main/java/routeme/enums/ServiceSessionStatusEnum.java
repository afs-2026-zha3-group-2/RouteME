package routeme.enums;

import routeme.exception.InvalidInputException;

/**
 * Customer service session status. Wire values are uppercase (design D16).
 */
public enum ServiceSessionStatusEnum {
    WAITING("WAITING"),
    HANDLING("HANDLING"),
    RESOLVED("RESOLVED"),
    CLOSED("CLOSED");

    private final String code;

    ServiceSessionStatusEnum(String code) {
        this.code = code;
    }

    public String code() {
        return code;
    }

    public static ServiceSessionStatusEnum of(String value) {
        for (ServiceSessionStatusEnum candidate : values()) {
            if (candidate.code.equals(value)) {
                return candidate;
            }
        }
        throw new InvalidInputException("unknown service session status: " + value);
    }
}