package routeme.response;

/** 最小用户引用，用于「最近操作人」与举报双方。 */
public record AdminUserRef(long id, String nickname) {
}