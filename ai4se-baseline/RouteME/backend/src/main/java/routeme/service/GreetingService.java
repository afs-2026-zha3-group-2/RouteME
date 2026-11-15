package routeme.service;

import com.baomidou.mybatisplus.spring.service.IService;

import routeme.entity.GreetingEntity;
import routeme.pojo.Greeting;

/**
 * 问候语（脚手架验收能力）。
 */
public interface GreetingService extends IService<GreetingEntity> {

    /**
     * 读取唯一一条问候语。
     *
     * @return 问候语领域对象
     * @throws routeme.exception.GreetingNotFoundException 表内没有记录时抛出
     */
    Greeting loadGreeting();
}