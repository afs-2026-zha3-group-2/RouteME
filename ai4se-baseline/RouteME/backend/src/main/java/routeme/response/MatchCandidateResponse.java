package routeme.response;

import java.time.Instant;

import routeme.pojo.MatchCandidate;

public record MatchCandidateResponse(TripSummaryResponse trip, MatchResponse match) {

    public static MatchCandidateResponse from(MatchCandidate candidate, Instant now) {
        return new MatchCandidateResponse(
                TripSummaryResponse.from(candidate.trip(), candidate.publisher(), now),
                MatchResponse.from(candidate.match()));
    }
}