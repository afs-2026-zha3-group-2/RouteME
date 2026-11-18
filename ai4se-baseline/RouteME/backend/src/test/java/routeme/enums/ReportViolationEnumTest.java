package routeme.enums;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

import routeme.exception.InvalidInputException;

class ReportViolationEnumTest {

    @Test
    void fixedTypes_mapToIssueDeductions() {
        assertThat(ReportViolationEnum.HARASSMENT.deduction(null)).isEqualTo(10);
        assertThat(ReportViolationEnum.FAKE_TRIP.deduction(null)).isEqualTo(15);
        assertThat(ReportViolationEnum.FRAUD_RISK.deduction(null)).isEqualTo(30);
        assertThat(ReportViolationEnum.ILLEGAL_CONTENT.deduction(null)).isEqualTo(20);
        assertThat(ReportViolationEnum.IMPERSONATION.deduction(null)).isEqualTo(20);
        assertThat(ReportViolationEnum.NO_SHOW_DISRUPTION.deduction(null)).isEqualTo(10);
        assertThat(ReportViolationEnum.PRIVACY_LEAK.deduction(null)).isEqualTo(30);
    }

    @Test
    void other_acceptsOnlyFourTiers() {
        assertThat(ReportViolationEnum.OTHER.deduction(5)).isEqualTo(5);
        assertThat(ReportViolationEnum.OTHER.deduction(10)).isEqualTo(10);
        assertThat(ReportViolationEnum.OTHER.deduction(20)).isEqualTo(20);
        assertThat(ReportViolationEnum.OTHER.deduction(30)).isEqualTo(30);
    }

    @Test
    void other_rejectsMissingOrUnknownTier() {
        assertThatThrownBy(() -> ReportViolationEnum.OTHER.deduction(null))
                .isInstanceOf(InvalidInputException.class);
        assertThatThrownBy(() -> ReportViolationEnum.OTHER.deduction(15))
                .isInstanceOf(InvalidInputException.class);
    }

    @Test
    void fixedTypes_ignoreProvidedTier() {
        assertThat(ReportViolationEnum.HARASSMENT.deduction(30)).isEqualTo(10);
    }

    @Test
    void parse_acceptsCaseAndWhitespace() {
        assertThat(ReportViolationEnum.parse(" harassment ")).isEqualTo(ReportViolationEnum.HARASSMENT);
        assertThat(ReportViolationEnum.parse("other")).isEqualTo(ReportViolationEnum.OTHER);
    }

    @Test
    void parse_rejectsMissingOrUnknown() {
        assertThatThrownBy(() -> ReportViolationEnum.parse(null))
                .isInstanceOf(InvalidInputException.class);
        assertThatThrownBy(() -> ReportViolationEnum.parse("SPAM"))
                .isInstanceOf(InvalidInputException.class);
    }
}
