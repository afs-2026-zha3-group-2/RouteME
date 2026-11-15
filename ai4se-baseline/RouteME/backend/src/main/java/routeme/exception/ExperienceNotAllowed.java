package routeme.exception;

/**
 * 当前用户不具备该行程的分享资格（未结束或未参加）。
 */
public class ExperienceNotAllowed extends RuntimeException {

    public ExperienceNotAllowed(long tripId, long userId) {
        super("experience not allowed for trip " + tripId + " and user " + userId);
    }
}