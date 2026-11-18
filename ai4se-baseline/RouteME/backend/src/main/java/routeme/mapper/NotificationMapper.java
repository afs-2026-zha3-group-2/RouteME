package routeme.mapper;

import org.apache.ibatis.annotations.Mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import routeme.entity.NotificationEntity;

/**
 * notifications 的 MyBatis-Plus 映射。
 *
 * <p>列表、计数与标读都用 {@code LambdaQueryWrapper} / {@code LambdaUpdateWrapper}，不写自定义 SQL。</p>
 */
@Mapper
public interface NotificationMapper extends BaseMapper<NotificationEntity> {
}