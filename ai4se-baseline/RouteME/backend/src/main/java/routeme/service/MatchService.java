package routeme.service;

import java.util.List;

import routeme.param.PageParam;
import routeme.pojo.MatchCandidate;
import routeme.pojo.PageResult;
import routeme.request.TripQuery;

/**
 * 同行匹配：在未结束行程上追加可解释的匹配分与理由。
 *
 * <p>不拥有数据表，是纯计算服务，因此不继承 {@code IService}。</p>
 */
public interface MatchService {

    /**
     * 计算候选行程与匹配理由。
     *
     * @param query  筛选条件；{@code sort=match} 时按匹配分倒序
     * @param userId 当前身份 id，其兴趣与最近行程作为匹配对照
     * @return 带 match 的候选行程
     */
    List<MatchCandidate> search(TripQuery query, long userId);

    /**
     * 分页版候选列表：匹配分在应用层计算后再切页。
     *
     * @param query  筛选条件
     * @param userId 当前身份 id
     * @param param  页码与每页条数（已校验）
     * @return 当前页候选与筛选后的命中总数
     */
    PageResult<MatchCandidate> searchPage(TripQuery query, long userId, PageParam param);

    /**
     * 单条行程相对当前身份的匹配度。
     *
     * @param tripId 行程 id
     * @param userId 当前身份 id
     * @return 行程与其匹配分、理由
     */
    MatchCandidate matchFor(long tripId, long userId);
}