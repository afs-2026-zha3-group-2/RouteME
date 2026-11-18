package routeme.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import routeme.entity.UserWalletEntity;

/**
 * user_wallet 的 MyBatis-Plus 映射。
 *
 * <p>余额变更只走条件更新（CAS）：{@code WHERE balance_cents = 变更前}，
 * 返回受影响行数供服务层判断是否需要重读重试。</p>
 */
@Mapper
public interface UserWalletMapper extends BaseMapper<UserWalletEntity> {

    @Update("""
            UPDATE user_wallet
               SET balance_cents = #{balanceAfter}, updated_at = #{updatedAt}
             WHERE user_id = #{userId} AND balance_cents = #{balanceBefore}
            """)
    int updateBalanceIfUnchanged(
            @Param("userId") long userId,
            @Param("balanceBefore") int balanceBefore,
            @Param("balanceAfter") int balanceAfter,
            @Param("updatedAt") String updatedAt);
}