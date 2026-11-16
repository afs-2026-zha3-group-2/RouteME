package routeme.pojo;

/**
 * 一对可沟通的聊天配对：行程与对方用户。
 *
 * <p>作为聊天左栏的数据源，覆盖「已匹配但尚无消息」的会话；
 * 申请状态为 accepted 或 left 时成立。</p>
 */
public record ChatCounterpart(long tripId, long otherUserId) {
}
