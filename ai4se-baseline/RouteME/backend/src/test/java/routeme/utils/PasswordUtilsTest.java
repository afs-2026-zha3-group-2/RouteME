package routeme.utils;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class PasswordUtilsTest {

    @Test
    void in_samePassword_out_differentHashes() {
        // When
        String first = PasswordUtils.hash("routeme-demo");
        String second = PasswordUtils.hash("routeme-demo");

        // Then
        assertAll(
                () -> assertNotEquals(first, second, "random salt makes every hash unique"),
                () -> assertFalse(first.contains("routeme-demo"), "hash must not contain the plaintext"),
                () -> assertTrue(first.startsWith("pbkdf2$"), "algorithm prefix"),
                () -> assertTrue(PasswordUtils.matches("routeme-demo", first), "first hash verifies"),
                () -> assertTrue(PasswordUtils.matches("routeme-demo", second), "second hash verifies"));
    }

    @Test
    void in_wrongPassword_out_false() {
        String encoded = PasswordUtils.hash("correct-horse");

        assertAll(
                () -> assertFalse(PasswordUtils.matches("wrong-horse", encoded), "wrong password"),
                () -> assertFalse(PasswordUtils.matches(null, encoded), "null password"),
                () -> assertFalse(PasswordUtils.matches("correct-horse", null), "demo account has no hash"),
                () -> assertFalse(PasswordUtils.matches("correct-horse", "plain-text"), "malformed hash"));
    }

    @Test
    void in_newToken_out_randomUrlSafeStrings() {
        String first = PasswordUtils.newToken();
        String second = PasswordUtils.newToken();

        assertAll(
                () -> assertNotEquals(first, second, "tokens are random"),
                () -> assertTrue(first.length() >= 40, "32 random bytes encode to 43 characters"),
                () -> assertFalse(first.contains("+") || first.contains("/"), "url-safe alphabet"));
    }
}