package routeme.response;

/**
 * 通知跳转目标：只给定位字段，路由规则交给前端。
 *
 * @param kind          目标种类（trip / applications / chat / credit / report / account / support / identity）
 * @param tripId        行程 id（trip / applications / chat 类）
 * @param otherUserId   会话另一方 id（chat 类）
 * @param applicationId 申请 id（applications 类）
 * @param reportId      举报 id（report 类）
 * @param sessionId     客服会话 id（support 类）
 */
public record NotificationTargetResponse(
        String kind,
        Long tripId,
        Long otherUserId,
        Long applicationId,
        Long reportId,
        Long sessionId) {
}