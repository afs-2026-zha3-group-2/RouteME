package routeme.service;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

import com.baomidou.mybatisplus.spring.service.IService;

import routeme.entity.TripExperienceEntity;
import routeme.param.PageParam;
import routeme.pojo.PageResult;
import routeme.request.ExperienceWriteRequest;
import routeme.response.ExperienceResponse;
import routeme.response.ExperienceSaveResponse;

/**
 * 游后体验：仅「已结束且参加过」的行程可写，每人每行程一条。
 */
public interface ExperienceService extends IService<TripExperienceEntity> {

    /**
     * 发布或更新我的体验（同一 (行程, 作者) 上 upsert）。
     *
     * @param tripId  行程 id，必须已结束
     * @param authorId 作者 id，必须是发布者或已接受同行者
     * @param request 正文、强度与给后来者的建议
     * @return 保存结果与是否首次创建
     */
    ExperienceSaveResponse upsert(long tripId, long authorId, ExperienceWriteRequest request);

    /**
     * 不分页的体验列表（测试与小数据量场景）。
     *
     * @param destinationCode 目的地 6 位代码精确匹配，可为 null
     * @param tags            兴趣标签，命中任一即保留，可为空集
     * @param viewerId        视角用户 id，用于 {@code is_liked}，可为 null
     * @return 按最近保存时间倒序的体验
     */
    List<ExperienceResponse> listAll(String destinationCode, Set<String> tags, Long viewerId);

    /**
     * 分页浏览体验：过滤、排序与分页都在数据库完成。
     *
     * @param destinationCode 目的地 6 位代码精确匹配，可为 null
     * @param dateFrom        出发不早于，可为 null
     * @param dateTo          出发不晚于，可为 null
     * @param tags            兴趣标签，可为空集
     * @param param           页码与每页条数（已校验）
     * @param viewerId        视角用户 id，用于 {@code is_liked}，可为 null
     * @return 当前页体验与筛选后的命中总数
     */
    PageResult<ExperienceResponse> listPage(
            String destinationCode, LocalDate dateFrom, LocalDate dateTo, Set<String> tags, PageParam param,
            Long viewerId);

    /**
     * 某条行程下的全部体验。
     *
     * @param tripId 行程 id，必须存在
     * @param viewerId 视角用户 id，用于 {@code is_liked}，可为 null
     * @return 按首次发布时间升序的体验
     */
    List<ExperienceResponse> listByTrip(long tripId, Long viewerId);

    /**
     * 我写过的体验；视角固定为作者本人，自己的体验恒为未赞。
     *
     * @param authorId 作者 id
     * @return 按最近保存时间倒序的体验
     */
    List<ExperienceResponse> mine(long authorId);
}