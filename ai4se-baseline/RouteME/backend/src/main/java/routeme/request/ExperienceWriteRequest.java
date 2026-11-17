package routeme.request;

import java.util.List;

public record ExperienceWriteRequest(String content, String intensity, String advice, List<Long> photoIds) {

    public ExperienceWriteRequest(String content, String intensity, String advice) {
        this(content, intensity, advice, List.of());
    }

    public List<Long> photoIdsOrDefault() {
        return photoIds == null ? List.of() : photoIds;
    }
}
