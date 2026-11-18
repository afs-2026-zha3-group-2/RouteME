package routeme.entity;

import java.time.Clock;
import java.util.List;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import routeme.model.ProfileRules;
import routeme.pojo.DemoUser;
import routeme.pojo.UserAccount;
import routeme.utils.JsonListUtils;

/**
 * app_users 行对象：JSON 列表在这里解析，不向上泄漏。
 */
@TableName("app_users")
public class UserEntity {

    @TableId(type = IdType.INPUT)
    private Long id;

    /** 登录用户名；演示账户为 null。 */
    private String username;

    /** PBKDF2 散列；演示账户为 null，因此不能密码登录。 */
    private String passwordHash;

    private String nickname;

    private String avatarInitial;

    private String school;

    private String bio;

    /** JSON 数组文本。 */
    private String interests;

    /** 头像地址，含缓存版本参数；无头像为 null。 */
    private String avatarUrl;

    /** {@code YYYY-MM-DD}；只在本人资料响应中返回。 */
    private String birthday;

    private String gender;

    private String city;

    private String major;

    private String job;

    private String mbti;

    private String travelStyle;

    private String createdAt;

    /** 学信网学籍认证状态：1 表示已通过演示核验。 */
    private Boolean studentVerified;

    /** 认证时填写的真实姓名，只作留痕，不下发给他人。 */
    private String studentVerifiedName;

    /** 认证院校，可公开展示。 */
    private String studentVerifiedSchool;

    /** 认证通过时间，ISO-8601 文本。 */
    private String studentVerifiedAt;

    /** Optional unique registration email; lower-cased on write. */
    private String email;

    /** {@code USER} / {@code ADMIN}. */
    private String role;

    /** {@code ACTIVE} / {@code SUSPENDED} / {@code BANNED}. */
    private String status;

    /** Reason of the latest suspend / ban / restore action. */
    private String statusReason;

    private String statusUpdatedAt;

    /** Administrator id that performed the latest status change. */
    private Long statusUpdatedBy;

    /** Ban expiry for BANNED accounts; historical value after restore. */
    private String banExpiresAt;

    private String banReasonCode;

    private String banReasonNote;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
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

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public String getBirthday() {
        return birthday;
    }

    public void setBirthday(String birthday) {
        this.birthday = birthday;
    }

    public String getGender() {
        return gender;
    }

    public void setGender(String gender) {
        this.gender = gender;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public String getMajor() {
        return major;
    }

    public void setMajor(String major) {
        this.major = major;
    }

    public String getJob() {
        return job;
    }

    public void setJob(String job) {
        this.job = job;
    }

    public String getMbti() {
        return mbti;
    }

    public void setMbti(String mbti) {
        this.mbti = mbti;
    }

    public String getTravelStyle() {
        return travelStyle;
    }

    public void setTravelStyle(String travelStyle) {
        this.travelStyle = travelStyle;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public Boolean getStudentVerified() {
        return studentVerified;
    }

    public void setStudentVerified(Boolean studentVerified) {
        this.studentVerified = studentVerified;
    }

    public String getStudentVerifiedName() {
        return studentVerifiedName;
    }

    public void setStudentVerifiedName(String studentVerifiedName) {
        this.studentVerifiedName = studentVerifiedName;
    }

    public String getStudentVerifiedSchool() {
        return studentVerifiedSchool;
    }

    public void setStudentVerifiedSchool(String studentVerifiedSchool) {
        this.studentVerifiedSchool = studentVerifiedSchool;
    }

    public String getStudentVerifiedAt() {
        return studentVerifiedAt;
    }

    public void setStudentVerifiedAt(String studentVerifiedAt) {
        this.studentVerifiedAt = studentVerifiedAt;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getStatusReason() {
        return statusReason;
    }

    public void setStatusReason(String statusReason) {
        this.statusReason = statusReason;
    }

    public String getStatusUpdatedAt() {
        return statusUpdatedAt;
    }

    public void setStatusUpdatedAt(String statusUpdatedAt) {
        this.statusUpdatedAt = statusUpdatedAt;
    }

    public Long getStatusUpdatedBy() {
        return statusUpdatedBy;
    }

    public void setStatusUpdatedBy(Long statusUpdatedBy) {
        this.statusUpdatedBy = statusUpdatedBy;
    }

    public String getBanExpiresAt() {
        return banExpiresAt;
    }

    public void setBanExpiresAt(String banExpiresAt) {
        this.banExpiresAt = banExpiresAt;
    }

    public String getBanReasonCode() {
        return banReasonCode;
    }

    public void setBanReasonCode(String banReasonCode) {
        this.banReasonCode = banReasonCode;
    }

    public String getBanReasonNote() {
        return banReasonNote;
    }

    public void setBanReasonNote(String banReasonNote) {
        this.banReasonNote = banReasonNote;
    }

    public DemoUser toDemoUser() {
        return toDemoUser(Clock.systemUTC());
    }

    public DemoUser toDemoUser(Clock clock) {
        List<String> parsedInterests = JsonListUtils.parse(interests);
        return new DemoUser(
                id,
                nickname,
                avatarInitial,
                avatarUrl,
                school,
                city,
                major,
                job,
                bio,
                parsedInterests,
                ProfileRules.complete(nickname, birthday, gender, city, parsedInterests, travelStyle, clock),
                Boolean.TRUE.equals(studentVerified),
                role,
                status);
    }

    public UserAccount toUserAccount() {
        return new UserAccount(
                id, username, passwordHash, nickname, avatarInitial, school, bio, JsonListUtils.parse(interests),
                avatarUrl, birthday, gender, city, major, job, mbti, travelStyle, email, role, status,
                Boolean.TRUE.equals(studentVerified));
    }
}