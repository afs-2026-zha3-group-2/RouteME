package routeme.mapper;

import org.apache.ibatis.annotations.Mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import routeme.entity.WalletLedgerEntity;

/**
 * wallet_ledger 的 MyBatis-Plus 映射；只追加，不提供更新与删除封装。
 */
@Mapper
public interface WalletLedgerMapper extends BaseMapper<WalletLedgerEntity> {
}