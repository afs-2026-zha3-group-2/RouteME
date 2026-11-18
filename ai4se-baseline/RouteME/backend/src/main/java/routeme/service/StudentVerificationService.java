package routeme.service;

import java.time.Clock;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import routeme.constant.ProfileConstant;
import routeme.entity.UserEntity;
import routeme.enums.AccountRoleEnum;
import routeme.exception.InvalidStudentVerificationException;
import routeme.exception.StudentVerificationRequiredException;
import routeme.exception.UserNotFoundException;
import routeme.pojo.DemoUser;
import routeme.request.StudentVerificationRequest;

/**
 * 学信网学籍认证（演示核验）：校验姓名 / 院校 / 在线验证码格式后直接置为已认证，
 * 并作为发布、申请、聊天与体验分享的写入门槛。
 *
 * <p>真实学信网没有面向第三方应用的公开核验接口，本实现只做确定性的格式校验，
 * 校验通过即视为通过；接入真实接口时只需替换 {@link #verify} 的判定部分。</p>
 */
@Service
public class StudentVerificationService {

    /** 学信网在线验证报告验证码：12 位字母或数字。 */
    private static final Pattern VERIFICATION_CODE = Pattern.compile("[A-Za-z0-9]{12}");
    private static final int MIN_NAME_LENGTH = 2;
    private static final int MAX_NAME_LENGTH = 20;
    private static final int MIN_SCHOOL_LENGTH = 2;
    private static final int MAX_SCHOOL_LENGTH = 60;

    private final DemoUserService demoUserService;
    private final Clock clock;

    public StudentVerificationService(DemoUserService demoUserService, Clock clock) {
        this.demoUserService = demoUserService;
        this.clock = clock;
    }

    /**
     * 提交学信网认证信息。重复提交会刷新姓名、院校与认证时间，便于演示重试。
     *
     * @throws InvalidStudentVerificationException 任一字段不合规
     */
    @Transactional
    public DemoUser verify(long userId, StudentVerificationRequest request) {
        Map<String, String> fields = validate(request);
        if (!fields.isEmpty()) {
            throw new InvalidStudentVerificationException(fields);
        }
        UserEntity entity = requireEntity(userId);
        entity.setStudentVerified(true);
        entity.setStudentVerifiedName(request.name().trim());
        entity.setStudentVerifiedSchool(request.school().trim());
        entity.setStudentVerifiedAt(clock.instant().toString());
        demoUserService.updateById(entity);
        return entity.toDemoUser(clock);
    }

    /**
     * 核心动作的写入门槛：管理员豁免，其余账号必须已完成学籍认证。
     */
    public void requireVerified(long userId) {
        UserEntity entity = requireEntity(userId);
        if (AccountRoleEnum.ADMIN.code().equals(entity.getRole())) {
            return;
        }
        if (!Boolean.TRUE.equals(entity.getStudentVerified())) {
            throw new StudentVerificationRequiredException(userId);
        }
    }

    Map<String, String> validate(StudentVerificationRequest request) {
        Map<String, String> fields = new LinkedHashMap<>();
        if (request == null) {
            fields.put("name", ProfileConstant.REASON_REQUIRED);
            fields.put("school", ProfileConstant.REASON_REQUIRED);
            fields.put("code", ProfileConstant.REASON_REQUIRED);
            return fields;
        }
        String name = request.name() == null ? "" : request.name().trim();
        if (name.isEmpty()) {
            fields.put("name", ProfileConstant.REASON_REQUIRED);
        } else if (name.length() < MIN_NAME_LENGTH) {
            fields.put("name", ProfileConstant.REASON_OUT_OF_RANGE);
        } else if (name.length() > MAX_NAME_LENGTH) {
            fields.put("name", ProfileConstant.REASON_TOO_LONG);
        }

        String school = request.school() == null ? "" : request.school().trim();
        if (school.isEmpty()) {
            fields.put("school", ProfileConstant.REASON_REQUIRED);
        } else if (school.length() < MIN_SCHOOL_LENGTH) {
            fields.put("school", ProfileConstant.REASON_OUT_OF_RANGE);
        } else if (school.length() > MAX_SCHOOL_LENGTH) {
            fields.put("school", ProfileConstant.REASON_TOO_LONG);
        }

        String code = request.code() == null ? "" : request.code().trim();
        if (code.isEmpty()) {
            fields.put("code", ProfileConstant.REASON_REQUIRED);
        } else if (!VERIFICATION_CODE.matcher(code.toUpperCase(Locale.ROOT)).matches()) {
            fields.put("code", ProfileConstant.REASON_INVALID_OPTION);
        }
        return fields;
    }

    private UserEntity requireEntity(long userId) {
        UserEntity entity = demoUserService.getById(userId);
        if (entity == null) {
            throw new UserNotFoundException(userId);
        }
        return entity;
    }
}
