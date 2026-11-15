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
     * 发布者把自己的行程标记为已结束（写 completed_at）。
     *
     * @param tripId 行程 id
     * @param userId 当前身份 id，必须等于发布者
     * @return 结束后的行程（状态 completed）
     */
    TripPlan complete(long tripId, long userId);

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