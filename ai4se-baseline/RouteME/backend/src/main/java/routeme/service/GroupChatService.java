package routeme.service;

import java.util.List;

import com.baomidou.mybatisplus.spring.service.IService;

import routeme.entity.TripGroupMessageEntity;
import routeme.pojo.GroupMessage;
import routeme.request.GroupMessageRequest;
import routeme.response.GroupChatSummaryResponse;

/**
 * 行程群聊：满员成行自动建群，发布者与当前已接受同行者可读写；
 * 已退出行程的同行者保留历史回看（只读），不能再发送；群一旦开设永久保留，
 * 行程结束 / 取消后也只读。
 */
public interface GroupChatService extends IService<TripGroupMessageEntity> {

    /**
     * 群是否已开设：行程当前满员，或已存在群消息（含满员时落的欢迎消息）。
     *
     * @param tripId 行程 id
     * @return 群已开设时为 true
     */
    boolean isOpen(long tripId);

    /**
     * 读取群消息，按发送时间升序。当前成员与已退出行程的同行者都可读。
     *
     * @param tripId 行程 id
     * @param userId 当前身份 id，必须是发布者、已接受同行者或曾加入后退出者
     * @return 群消息列表
     * @throws routeme.exception.TripNotFoundException   行程不存在或群未开设
     * @throws routeme.exception.ChatNotAllowedException 从未加入过该群
     */
    List<GroupMessage> messages(long tripId, long userId);

    /**
     * 发送一条群消息（1–500 字），并通知其他群成员。
     *
     * @param tripId   行程 id
     * @param senderId 发送者 id，必须是当前群成员
     * @param request  正文
     * @return 已落库的消息
     * @throws routeme.exception.GroupChatLeftException 已退出该群（历史可读、不能发送）
     * @throws routeme.exception.ChatReadOnlyException 行程已结束 / 已取消
     */
    GroupMessage send(long tripId, long senderId, GroupMessageRequest request);

    /**
     * 我的群聊列表：我是发布者、当前已接受同行者，或曾加入后退出（仅可回看）的群。
     *
     * @param userId 当前身份 id
     * @return 按最后消息时间倒序；无消息的群排末尾
     */
    List<GroupChatSummaryResponse> myGroups(long userId);
}