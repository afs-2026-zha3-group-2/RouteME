package routeme.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import routeme.model.DemoUser;
import routeme.utils.JsonListUtils;

/**
 * app_users 行对象：JSON 列表在这里解析，不向上泄漏。
 */
@TableName("app_users")
public class UserEntity {

    @TableId(type = IdType.INPUT)
    private Long id;

    private String nickname;

    private String avatarInitial;

    private String school;

    private String bio;

    /** JSON 数组文本。 */
    private String interests;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNickname() {
        return nickname;
    }

    public void setNickname(String nickname) {
        this.nickname = nickname;
    }

    public String getAvatarInitial() {
        return avatarInitial;
    }

    public void setAvatarInitial(String avatarInitial) {
        this.avatarInitial = avatarInitial;
    }

    public String getSchool() {
        return school;
    }

    public void setSchool(String school) {
        this.school = school;
    }

    public String getBio() {
        return bio;
    }

    public void setBio(String bio) {
        this.bio = bio;
    }

    public String getInterests() {
        return interests;
    }

    public void setInterests(String interests) {
        this.interests = interests;
    }

    public DemoUser toDemoUser() {
        return new DemoUser(id, nickname, avatarInitial, school, bio, JsonListUtils.parse(interests));
    }
}