package routeme.controller;

import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import routeme.response.MatchCandidateResponse;
import routeme.response.PageResponse;
import routeme.request.TripQuery;
import routeme.pojo.DemoUser;
import routeme.pojo.MatchCandidate;
import routeme.pojo.PageResult;
import routeme.param.PageParam;
import routeme.param.TripQueryParam;
import routeme.service.DemoUserService;
import routeme.service.MatchService;

@RestController
@RequestMapping("/api/matches")
public class MatchController {

    private final DemoUserService demoUserService;
    private final MatchService matchService;

    public MatchController(DemoUserService demoUserService, MatchService matchService) {
        this.demoUserService = demoUserService;
        this.matchService = matchService;
    }

    @GetMapping
    public PageResponse<MatchCandidateResponse> list(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestParam(name = "destination_code", required = false) String destinationCode,
            @RequestParam(name = "date_from", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(name = "date_to", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) String tags,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        DemoUser me = demoUserService.require(userId);
        TripQuery query = new TripQuery(
                destinationCode, dateFrom, dateTo,
                TripQueryParam.parseTags(tags), TripQueryParam.parseSortWithMatch(sort));
        PageResult<MatchCandidate> result = matchService.searchPage(query, me.id(), PageParam.parse(page, size));
        return PageResponse.from(result, MatchCandidateResponse::from);
    }

    @GetMapping("/{tripId}")
    public MatchCandidateResponse detail(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @PathVariable long tripId) {
        DemoUser me = demoUserService.require(userId);
        return MatchCandidateResponse.from(matchService.matchFor(tripId, me.id()));
    }
}