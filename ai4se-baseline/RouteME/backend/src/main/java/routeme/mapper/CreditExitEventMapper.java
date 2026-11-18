package routeme.mapper;

import org.apache.ibatis.annotations.Mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import routeme.entity.CreditExitEventEntity;

/**
 * credit_exit_event 的 MyBatis-Plus 映射；append-only，不提供更新与删除封装。
 */
@Mapper
public interface CreditExitEventMapper extends BaseMapper<CreditExitEventEntity> {
}
