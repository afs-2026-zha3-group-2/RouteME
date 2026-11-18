package routeme.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import routeme.entity.TravelLoanEntity;

/**
 * travel_loan 的 MyBatis-Plus 映射。
 *
 * <p>还款是条件更新：只有属于该用户且仍为 {@code ACTIVE} 的借款会被置为 {@code REPAID}；
 * 同一语句同时写入实收罚息并释放 active_user_id 唯一槽位，避免并发重复扣款。</p>
 */
@Mapper
public interface TravelLoanMapper extends BaseMapper<TravelLoanEntity> {

    @Update("""
            UPDATE travel_loan
               SET status = 'REPAID', active_user_id = NULL, repaid_at = #{repaidAt},
                   penalty_cents = #{penaltyCents}
             WHERE id = #{loanId} AND user_id = #{userId} AND status = 'ACTIVE'
            """)
    int repayIfActive(
            @Param("loanId") long loanId,
            @Param("userId") long userId,
            @Param("repaidAt") String repaidAt,
            @Param("penaltyCents") int penaltyCents);
}