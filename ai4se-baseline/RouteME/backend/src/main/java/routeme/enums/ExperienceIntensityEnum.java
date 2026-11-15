package routeme.enums;

import java.util.Arrays;

import routeme.exception.InvalidInputException;

/**
 * 路线强度：原型三档，对外 wire 值为小写。
 */
public enum ExperienceIntensityEnum {
    RELAXED("relaxed", "轻松"),
    MODERATE("moderate", "适中"),
    TIRING("tiring", "较累");

    private final String wireValue;
    private final String label;

    ExperienceIntensityEnum(String wireValue, String label) {
        this.wireValue = wireValue;
        this.label = label;
    }

    public String wireValue() {
        return wireValue;
    }

    public String label() {
        return label;
    }

    public static ExperienceIntensityEnum fromWire(String value) {
        String normalized = value == null ? "" : value.trim();
        return Arrays.stream(values())
                .filter(intensity -> intensity.wireValue.equals(normalized))
                .findFirst()
                .orElseThrow(() -> new InvalidInputException("intensity must be one of relaxed/moderate/tiring"));
    }
}