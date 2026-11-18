package routeme.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import routeme.entity.TravelLoanEntity;

/**
 * travel_loan 的 MyBatis-Plus 映射。
 *
 * <p>还款用条件更新：只有 {@code ACTIVE} 的本人借款能迁移为 {@code REPAID}，
 * 并同时把 {@code active_user_id} 置 NULL 释放单人单笔唯一索引。</p>
 */
@Mapper
public interface TravelLoanMapper extends BaseMapper<TravelLoanEntity> {

    @Update("""
            UPDATE travel_loan
               SET status = 'REPAID', active_user_id = NULL, repaid_at = #{repaidAt}
             WHERE id = #{loanId} AND user_id = #{userId} AND status = 'ACTIVE'
            """)
    int repayIfActive(
            @Param("loanId") long loanId,
            @Param("userId") long userId,
            @Param("repaidAt") String repaidAt);
}