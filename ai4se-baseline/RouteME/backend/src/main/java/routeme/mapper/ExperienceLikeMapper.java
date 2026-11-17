package routeme.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Arg;
import org.apache.ibatis.annotations.ConstructorArgs;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import routeme.entity.ExperienceLikeEntity;
import routeme.pojo.ExperienceLikeStat;

/**
 * experience_likes 的 MyBatis-Plus 映射。
 *
 * <p>列表读取一次聚合出「赞数 + 当前查看者点赞态」，不在体验列表上新增 N+1。</p>
 */
@Mapper
public interface ExperienceLikeMapper extends BaseMapper<ExperienceLikeEntity> {

    @Select("""
            SELECT COUNT(*) FROM experience_likes
             WHERE experience_id = #{experienceId}
            """)
    int countByExperience(@Param("experienceId") long experienceId);

    @Select("""
            <script>
            SELECT experience_id,
                   COUNT(*) AS like_count,
                   SUM(CASE WHEN user_id = #{viewerId} THEN 1 ELSE 0 END) AS liked_count
              FROM experience_likes
             WHERE experience_id IN
             <foreach collection="experienceIds" item="experienceId" open="(" separator="," close=")">
               #{experienceId}
             </foreach>
             GROUP BY experience_id
            </script>
            """)
    @ConstructorArgs({
            @Arg(column = "experience_id", javaType = long.class),
            @Arg(column = "like_count", javaType = int.class),
            @Arg(column = "liked_count", javaType = boolean.class)
    })
    List<ExperienceLikeStat> selectStatsByExperienceIds(
            @Param("experienceIds") List<Long> experienceIds, @Param("viewerId") long viewerId);

    @Select("""
            SELECT COUNT(l.id)
              FROM trip_experiences e
              LEFT JOIN experience_likes l ON l.experience_id = e.id
             WHERE e.trip_id = #{tripId} AND e.author_id = #{authorId}
             GROUP BY e.id
            """)
    List<Integer> selectLikeCountsOfTripAuthor(
            @Param("tripId") long tripId, @Param("authorId") long authorId);

    @Delete("""
            DELETE FROM experience_likes
             WHERE experience_id = #{experienceId} AND user_id = #{userId}
            """)
    int deleteByExperienceAndUser(
            @Param("experienceId") long experienceId, @Param("userId") long userId);
}
