package routeme.model;

import java.time.Clock;
import java.time.Instant;
import java.time.format.DateTimeParseException;

import routeme.enums.BanReasonEnum;
import routeme.exception.InvalidInputException;

/**
 * 处罚表单的共享校验：理由与备注长度、8 项封禁理由、{@code OTHER} 必填说明、
 * 解封时间必须是未来时间。
 */
public final class PenaltyRules {

    public static final int MAX_REASON_LENGTH = 200;
    public static final int MAX_BAN_NOTE_LENGTH = 200;

    private PenaltyRules() {
    }

    public static String requireText(String value, String field, int maxLength) {
        String trimmed = value == null ? "" : value.trim();
        if (trimmed.isEmpty()) {
            throw new InvalidInputException(field + " is required");
        }
        if (trimmed.length() > maxLength) {
            throw new InvalidInputException(field + " must be at most " + maxLength + " characters");
        }
        return trimmed;
    }

    public static String optionalText(String value, String field, int maxLength) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        if (trimmed.length() > maxLength) {
            throw new InvalidInputException(field + " must be at most " + maxLength + " characters");
        }
        return trimmed;
    }

    public static BanReasonEnum requireBanReason(String code) {
        return BanReasonEnum.of(requireText(code, "ban_reason_code", 24));
    }

    public static Instant requireFutureExpiry(String raw, Clock clock) {
        String value = requireText(raw, "ban_expires_at", 40);
        Instant expiresAt;
        try {
            expiresAt = Instant.parse(value);
        } catch (DateTimeParseException exception) {
            throw new InvalidInputException("ban_expires_at must be an ISO-8601 instant");
        }
        if (!expiresAt.isAfter(clock.instant())) {
            throw new InvalidInputException("ban_expires_at must be in the future");
        }
        return expiresAt;
    }

    public static void requireNoteForOther(BanReasonEnum reason, String note) {
        if (reason == BanReasonEnum.OTHER && (note == null || note.isBlank())) {
            throw new InvalidInputException("ban_reason_note is required when ban_reason_code is OTHER");
        }
    }
}