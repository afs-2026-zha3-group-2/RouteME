package routeme.mapper;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.nio.file.Path;
import java.util.Optional;

import javax.sql.DataSource;

import org.apache.ibatis.mapping.Environment;
import org.apache.ibatis.session.SqlSession;
import org.apache.ibatis.session.SqlSessionFactory;
import org.apache.ibatis.transaction.jdbc.JdbcTransactionFactory;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.MybatisSqlSessionFactoryBuilder;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;

import routeme.entity.GreetingEntity;
import routeme.pojo.Greeting;

/**
 * 用临时 SQLite 文件库执行同一组迁移脚本，验证运行时数据库与 MyBatis-Plus 映射真的可用，
 * 而不是只在 H2 上通过。
 */
class GreetingMapperSqliteTest {

    @TempDir
    Path tempDirectory;

    @Test
    void in_emptySqliteFile_out_greetingSeeded() {
        // Given
        String databaseUrl = "jdbc:sqlite:" + toSqlitePath(tempDirectory.resolve("routeme.db"));
        Flyway.configure()
                .dataSource(databaseUrl, null, null)
                .locations("classpath:db/migration")
                .load()
                .migrate();
        DataSource dataSource = new DriverManagerDataSource(databaseUrl);
        SqlSessionFactory factory = sqlSessionFactory(dataSource);

        // When
        GreetingEntity entity;
        try (SqlSession session = factory.openSession(true)) {
            entity = session.getMapper(GreetingMapper.class).selectOne(
                    Wrappers.<GreetingEntity>lambdaQuery().eq(GreetingEntity::getId, 1L));
        }

        // Then
        assertEquals(Optional.of(new Greeting(1, "Hello World")),
                Optional.ofNullable(entity).map(GreetingEntity::toGreeting));
    }

    private SqlSessionFactory sqlSessionFactory(DataSource dataSource) {
        MybatisConfiguration configuration = new MybatisConfiguration();
        configuration.setMapUnderscoreToCamelCase(true);
        configuration.setEnvironment(new Environment("sqlite-test", new JdbcTransactionFactory(), dataSource));
        configuration.addMapper(GreetingMapper.class);
        return new MybatisSqlSessionFactoryBuilder().build(configuration);
    }

    private String toSqlitePath(Path path) {
        return path.toAbsolutePath().toString().replace('\\', '/');
    }
}