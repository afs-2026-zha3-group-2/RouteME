package routeme.response;

import routeme.pojo.MatchCandidate;

public record MatchCandidateResponse(TripSummaryResponse trip, MatchResponse match) {

    public static MatchCandidateResponse from(MatchCandidate candidate) {
        return new MatchCandidateResponse(
                TripSummaryResponse.from(candidate.trip(), candidate.publisher()),
                MatchResponse.from(candidate.match()));
    }
}