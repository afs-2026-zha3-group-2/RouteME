package routeme.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import routeme.entity.TripExperiencePhotoEntity;

/**
 * trip_experience_photos 的 MyBatis-Plus 映射。
 *
 * <p>查询均按 (trip_id, author_id) 限定作用域；批量读取按 experience_id 分组，
 * 避免在体验列表上新增 N+1。</p>
 */
public interface TripExperiencePhotoMapper extends BaseMapper<TripExperiencePhotoEntity> {

    @Select("""
            SELECT * FROM trip_experience_photos
             WHERE trip_id = #{tripId} AND author_id = #{authorId}
             ORDER BY created_at, id
            """)
    List<TripExperiencePhotoEntity> selectByScope(@Param("tripId") long tripId, @Param("authorId") long authorId);

    @Select("""
            SELECT COUNT(*) FROM trip_experience_photos
             WHERE trip_id = #{tripId} AND author_id = #{authorId}
            """)
    int countByScope(@Param("tripId") long tripId, @Param("authorId") long authorId);

    @Select("""
            SELECT * FROM trip_experience_photos
             WHERE trip_id = #{tripId} AND author_id = #{authorId}
               AND experience_id IS NULL AND created_at < #{cutoff}
             ORDER BY created_at, id
            """)
    List<TripExperiencePhotoEntity> selectUnownedBefore(
            @Param("tripId") long tripId,
            @Param("authorId") long authorId,
            @Param("cutoff") String cutoff);

    @Select("""
            <script>
            SELECT * FROM trip_experience_photos
             WHERE experience_id IN
             <foreach collection="experienceIds" item="experienceId" open="(" separator="," close=")">
               #{experienceId}
             </foreach>
             ORDER BY experience_id, sort_order, id
            </script>
            """)
    List<TripExperiencePhotoEntity> selectByExperienceIds(
            @Param("experienceIds") List<Long> experienceIds);

    @Select("""
            SELECT * FROM trip_experience_photos
             WHERE experience_id = #{experienceId}
             ORDER BY sort_order, id
            """)
    List<TripExperiencePhotoEntity> selectByExperience(@Param("experienceId") long experienceId);

    @Update("""
            UPDATE trip_experience_photos
               SET experience_id = #{experienceId}, sort_order = #{sortOrder}
             WHERE id = #{id}
            """)
    int bind(
            @Param("id") long id,
            @Param("experienceId") long experienceId,
            @Param("sortOrder") int sortOrder);

    @Delete("""
            <script>
            DELETE FROM trip_experience_photos
             WHERE id IN
             <foreach collection="ids" item="id" open="(" separator="," close=")">
               #{id}
             </foreach>
            </script>
            """)
    int deleteByIds(@Param("ids") List<Long> ids);
}
