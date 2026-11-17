package routeme.service;

import java.util.List;
import java.util.Optional;

import com.baomidou.mybatisplus.spring.service.IService;

import routeme.entity.TripPlanEntity;
import routeme.param.PageParam;
import routeme.pojo.DemoUser;
import routeme.pojo.PageResult;
import routeme.pojo.TripPlan;
import routeme.request.TripCreateRequest;
import routeme.request.TripCancelRequest;
import routeme.request.TripMeetingRequest;
import routeme.request.TripQuery;

/**
 * 行程能力：发布、浏览、详情、结束与同行人数联动。
 *
 * <p>继承 {@link IService} 以获得表 CRUD；业务方法只收发领域对象 {@link TripPlan}，
 * 不把实体 {@link TripPlanEntity} 暴露给上层。</p>
 */
public interface TripPlanService extends IService<TripPlanEntity> {

    /**
     * 发布一条行程，校验全部发布约束后落库。
     *
     * @param request     发布入参，必填项与约束见契约 TripCreateRequest
     * @param publisherId 发布者（演示身份）id，创建后 joined_count 计为 1
     * @return 已落库的行程领域对象（含生成的 id 与 recruiting 状态）
     */
    TripPlan create(TripCreateRequest request, long publisherId);

    /**
     * 分页浏览未结束行程：过滤、排序与分页都在数据库完成。
     *
     * @param query 关键词、目的地、日期区间、兴趣标签与排序条件
     * @param param 页码与每页条数（已校验）
     * @return 当前页行程与筛选后的命中总数
     */
    PageResult<TripPlan> searchPage(TripQuery query, PageParam param);

    /**
     * 未结束行程的全量筛选结果；匹配分只能在应用层排序，故搜索先取全量。
     *
     * @param query 关键词、目的地、日期区间、兴趣标签与排序条件
     * @return 命中全部行程，已按 query 的排序键有序
     */
    List<TripPlan> findOpen(TripQuery query);

    /**
     * 全部行程（含已结束）：我的旅行需要跨发布者聚合，故提供全量列表。
     *
     * @return 按创建时间倒序的行程
     */
    List<TripPlan> findAllTrips();

    /**
     * 按 id 取行程，不存在时抛 {@link routeme.exception.TripNotFoundException}。
     *
     * @param tripId 行程 id
     * @return 行程领域对象
     */
    TripPlan require(long tripId);

    /**
     * 取行程前先物化到期状态：到期未完成的行程会写入计划结束时刻并取消待处理申请。
     * 所有写操作与详情读取应使用本方法，避免页面停留导致的状态过期。
     *
     * @param tripId 行程 id
     * @return 当前状态下的行程
     */
    TripPlan requireCurrent(long tripId);

    /**
     * 物化单条到期行程；未到期或已完成时原样返回。条件更新保证并发幂等。
     *
     * @param tripId 行程 id
     * @return 物化后的行程
     */
    TripPlan materializeIfExpired(long tripId);

    /**
     * 批量物化所有到期未完成的行程；供列表、我的旅行与统计查询前调用。
     */
    void materializeExpired();

    /**
     * 取发布者最近发布且未结束的行程，用于匹配对照。
     *
     * @param publisherId 发布者 id
     * @return 最近一条未结束行程；没有则返回空
     */
    Optional<TripPlan> latestOpenByPublisher(long publisherId);

    /**
     * 取行程发布者资料。
     *
     * @param trip 行程领域对象
     * @return 发布者的演示账户资料
     */
    DemoUser publisherOf(TripPlan trip);

    /**
     * 发布者取消自己的行程（仅招募中 / 已满员）。
     *
     * <p>取消是终态：写入 cancelled_at 与原因，同一事务内取消待处理申请；
     * 条件更新保证并发只成功一次。</p>
     *
     * @param tripId      行程 id
     * @param publisherId 当前身份 id，必须等于发布者
     * @param request     取消原因与说明
     * @return 取消后的行程（状态 cancelled）
     */
    TripPlan cancel(long tripId, long publisherId, TripCancelRequest request);

    /**
     * 系统因信用限制取消行程：允许招募中 / 已满员 / 旅行中；已完成 / 已取消 no-op。
     */
    TripPlan cancelByCreditRestriction(long tripId, java.time.Instant now);

    /**
     * 系统因信用限制取消某发布者全部未结束行程（含旅行中）。
     */
    void cancelUnfinishedByPublisher(long publisherId, java.time.Instant now);

    /** 发布者把自己的行程标记为已结束（写 completed_at）。
     *
     * @param tripId 行程 id
     * @param userId 当前身份 id，必须等于发布者
     * @return 结束后的行程（状态 completed）
     */
    TripPlan complete(long tripId, long userId);

    /**
     * 发布者维护集合区域与集合时间：只改这两个字段，招募中与已满员可用。
     *
     * <p>两个字段整体替换：未传或传 null 视为清空。</p>
     *
     * @param tripId      行程 id
     * @param publisherId 当前身份 id，必须等于发布者
     * @param request     集合区域与集合时间
     * @return 更新后的行程
     */
    TripPlan updateMeeting(long tripId, long publisherId, TripMeetingRequest request);

    /**
     * 接受同行后人数 +1；达上限时状态自动转为 full。
     *
     * @param tripId 行程 id
     * @return 更新后的行程
     */
    TripPlan addCompanion(long tripId);

    /**
     * 退出同行后人数 -1；已结束行程不允许退出。
     *
     * @param tripId 行程 id
     * @return 更新后的行程
     */
    TripPlan removeCompanion(long tripId);
}