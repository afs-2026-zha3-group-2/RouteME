package routeme.service;

import java.util.List;
import java.util.Map;

import routeme.pojo.ExperienceLikeStat;
import routeme.response.ExperienceLikeSaveResponse;

/**
 * 体验点赞：记录即事实，赞数始终由记录数派生。
 */
public interface ExperienceLikeService {

    /**
     * 点赞他人体验。
     *
     * @param experienceId 体验 id，必须存在
     * @param userId       点赞者 id，不能是体验作者
     * @return 最新赞数、点赞态与是否首次创建
     */
    ExperienceLikeSaveResponse like(long experienceId, long userId);

    /**
     * 取消点赞；未赞时按幂等成功处理。
     *
     * @param experienceId 体验 id，必须存在
     * @param userId       当前用户 id
     */
    void unlike(long experienceId, long userId);

    /**
     * 批量读取赞数与指定视角的点赞态；空列表返回空映射。
     *
     * @param experienceIds 体验 id 列表
     * @param viewerId      视角用户 id，可为 null（一律未赞）
     * @return 以体验 id 为键的点赞统计
     */
    Map<Long, ExperienceLikeStat> statsOf(List<Long> experienceIds, Long viewerId);
}
