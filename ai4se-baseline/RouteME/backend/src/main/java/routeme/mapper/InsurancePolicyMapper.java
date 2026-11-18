package routeme.mapper;

import org.apache.ibatis.annotations.Mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import routeme.entity.InsurancePolicyEntity;

/**
 * insurance_policy 的 MyBatis-Plus 映射。
 */
@Mapper
public interface InsurancePolicyMapper extends BaseMapper<InsurancePolicyEntity> {
}