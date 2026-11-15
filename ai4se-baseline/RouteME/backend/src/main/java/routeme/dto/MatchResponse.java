package routeme.dto;

import java.util.List;
import routeme.model.TripMatch;

public record MatchResponse(int score, int percentage, List<String> reasons, String basis) {

    public static MatchResponse from(TripMatch match) {
        return new MatchResponse(match.score(), match.percentage(), match.reasons(), match.basis());
    }
}