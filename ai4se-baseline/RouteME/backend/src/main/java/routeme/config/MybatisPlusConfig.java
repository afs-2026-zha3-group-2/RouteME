package routeme.config;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.baomidou.mybatisplus.annotation.DbType;
import com.baomidou.mybatisplus.extension.plugins.MybatisPlusInterceptor;
import com.baomidou.mybatisplus.extension.plugins.inner.PaginationInnerInterceptor;

/**
 * MyBatis-Plus 装配：mapper 扫描与分页拦截器。
 *
 * <p>分页拦截器不固定 {@link DbType}：运行时是 SQLite、测试是 H2，按 JDBC URL 自动识别，
 * 两者都使用 LIMIT/OFFSET。</p>
 */
@Configuration
@MapperScan("routeme.mapper")
public class MybatisPlusConfig {

    private static final long MAX_PAGE_SIZE = 50L;

    @Bean
    public MybatisPlusInterceptor mybatisPlusInterceptor() {
        PaginationInnerInterceptor pagination = new PaginationInnerInterceptor();
        pagination.setMaxLimit(MAX_PAGE_SIZE);
        pagination.setOverflow(false);
        MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
        interceptor.addInnerInterceptor(pagination);
        return interceptor;
    }
}