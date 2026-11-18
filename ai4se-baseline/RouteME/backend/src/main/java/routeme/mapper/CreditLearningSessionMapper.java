package routeme.mapper;

import org.apache.ibatis.annotations.Mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import routeme.entity.CreditLearningSessionEntity;

/**
 * credit_learning_session 的 MyBatis-Plus 映射；月度次数按 (user_id, month_key) 计数派生。
 */
@Mapper
public interface CreditLearningSessionMapper extends BaseMapper<CreditLearningSessionEntity> {
}
