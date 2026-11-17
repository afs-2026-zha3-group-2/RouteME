package routeme.enums;

/**
 * Which write scope a guard call protects (design D5).
 *
 * <p>{@code SUSPENDED} accounts may still submit reports and contact support; {@code BANNED}
 * accounts may not write at all.</p>
 */
public enum WriteScopeEnum {
    BUSINESS,
    REPORT,
    SUPPORT
}