package routeme.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import routeme.pojo.Greeting;

/**
 * greetings 行对象。
 */
@TableName("greetings")
public class GreetingEntity {

    @TableId(type = IdType.INPUT)
    private Long id;

    private String message;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public Greeting toGreeting() {
        return new Greeting(id, message);
    }
}