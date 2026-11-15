package routeme.service;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.annotation.Transactional;

import routeme.enums.ApplicationStatusEnum;
import routeme.enums.TripStatusEnum;
import routeme.exception.ApplicationNotPendingException;
import routeme.exception.ForbiddenActionException;
import routeme.exception.TripNotOpenException;
import routeme.model.DemoUser;
import routeme.model.TripApplication;
import routeme.model.TripPlan;

@SpringBootTest
@Transactional
class ApplicationServiceTest {

    @Autowired
    private ApplicationService applicationService;

    @Autowired
    private TripPlanService tripPlanService;

        @Autowired
        private JdbcClient jdbcClient;

    @Test
    void in_pendingApplication_out_acceptedWithJoinedCount() {
        // When
        TripApplication decided = applicationService.accept(6, 2);

        // Then
        TripPlan trip = tripPlanService.require(5);
        assertAll(
                () -> assertEquals(ApplicationStatusEnum.ACCEPTED, decided.status(), "status accepted"),
                () -> assertNotNull(decided.decidedAt(), "decided at"),
                () -> assertEquals(2, trip.joinedCount(), "joined count +1"));
    }

    @Test
    void in_acceptReachingCapacity_out_tripBecomesFullAndStopsApplications() {
            // Given two extra applicants, so a new one still exists after the trip turns full.
            insertExtraUser(4);
            insertExtraUser(5);

            // When the third member is accepted, capacity 3 is reached.
            applicationService.accept(4, 2);
            TripApplication third = applicationService.apply(3, 4, null);
            applicationService.accept(third.id(), 2);

            // Then
            TripPlan trip = tripPlanService.require(3);
            assertAll(
                    () -> assertEquals(3, trip.joinedCount(), "capacity reached"),
                    () -> assertEquals(TripStatusEnum.FULL, trip.status(), "auto full"),
                    () -> assertThrows(TripNotOpenException.class, () -> applicationService.apply(3, 5, null),
                            "new applications rejected when full"));
        }

    @Test
    void in_rejectedApplication_out_statusRejectedWithoutJoinedCountChange() {
        // When
        TripApplication decided = applicationService.reject(6, 2);

        // Then
        assertAll(
                () -> assertEquals(ApplicationStatusEnum.REJECTED, decided.status(), "status rejected"),
                () -> assertEquals(1, tripPlanService.require(5).joinedCount(), "joined count unchanged"));
    }

    @Test
    void in_decideByNonPublisher_out_forbidden() {
        assertThrows(ForbiddenActionException.class, () -> applicationService.accept(6, 1));
        assertThrows(ForbiddenActionException.class, () -> applicationService.reject(6, 1));
    }

    @Test
    void in_decideNonPendingApplication_out_notPending() {
        assertThrows(ApplicationNotPendingException.class, () -> applicationService.accept(1, 1));
    }

    @Test
    void in_listByNonPublisher_out_forbidden() {
        assertThrows(ForbiddenActionException.class, () -> applicationService.listForPublisher(3, 1));
    }

    @Test
    void in_acceptedApplication_out_participantsIncludeCompanion() {
        // When
        applicationService.accept(6, 2);

        // Then
        List<DemoUser> participants = applicationService.participants(5);
        assertAll(
                () -> assertEquals(2, participants.size(), "publisher plus companion"),
                () -> assertEquals(2, participants.get(0).id(), "publisher first"),
                () -> assertEquals(3, participants.get(1).id(), "accepted applicant second"));
    }

            private void insertExtraUser(long id) {
                jdbcClient.sql("""
                                INSERT INTO app_users (id, nickname, avatar_initial, school, bio, interests, created_at)
                                VALUES (:id, :nickname, '测', '大一 · 测试', '满员场景用户', '["摄影"]', '2026-11-15T00:00:00Z')
                                """)
                        .param("id", id)
                        .param("nickname", "测试用户" + id)
                        .update();
            }
        }