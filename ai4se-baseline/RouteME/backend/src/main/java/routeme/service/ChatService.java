package routeme.service;

import java.util.List;

import com.baomidou.mybatisplus.spring.service.IService;

import routeme.entity.ChatMessageEntity;
import routeme.pojo.ChatMessage;
import routeme.request.ChatMessageRequest;
import routeme.response.ChatPartnerResponse;

/**
 * 同行聊天：仅已匹配双方可读可写，行程结束后只读。
 */
public interface ChatService extends IService<ChatMessageEntity> {

    /**
     * 读取与某位同行者在某个行程下的完整会话。
     *
     * @param tripId     行程 id
     * @param userId     当前身份 id
     * @param withUserId 对话另一方 id；双方之一必须是发布者且另一方已接受
     * @return 按发送时间升序的消息列表
     */
    List<ChatMessage> conversation(long tripId, long userId, long withUserId);

    /**
     * 读取两名用户在某行程下的完整会话，不做访问校验。
     *
     * <p>仅供管理端举报取证使用：举报详情需要回放举报人与被举报人的原始会话，
     * 即使其中一方已退出该行程。调用方 MUST 先确认自己拥有管理员权限。</p>
     *
     * @param tripId      行程 id
     * @param firstUserId 会话一方
     * @param secondUserId 会话另一方
     * @return 按发送时间升序的消息列表
     */
    List<ChatMessage> transcript(long tripId, long firstUserId, long secondUserId);

    /**
     * 发送一条消息。
     *
     * @param tripId   行程 id
     * @param senderId 发送者 id
     * @param request  接收者与正文（正文必填，不超过 500 字）
     * @return 已落库的消息
     */
    ChatMessage send(long tripId, long senderId, ChatMessageRequest request);

    /**
     * 我参与过会话的同行者列表。
     *
     * @param userId 当前身份 id
     * @return 每个 (行程, 对方) 一条，按最后消息时间倒序
     */
    List<ChatPartnerResponse> partners(long userId);
}