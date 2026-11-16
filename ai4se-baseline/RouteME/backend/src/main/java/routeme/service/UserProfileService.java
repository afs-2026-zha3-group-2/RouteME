package routeme.service;

import java.util.Optional;

import org.springframework.web.multipart.MultipartFile;

import routeme.pojo.AvatarFile;
import routeme.pojo.UserProfile;
import routeme.request.UserProfileUpdateRequest;

/**
 * 个人资料：读取、保存与头像存取。
 */
public interface UserProfileService {

    /**
     * 读取资料；生日只对本人可见。
     *
     * @param targetUserId 资料所属用户
     * @param callerUserId 当前身份
     * @return 资料视图
     */
    UserProfile read(long targetUserId, long callerUserId);

    /**
     * 保存本人资料：先校验再一次性更新，失败不写任何字段。
     *
     * @param userId  会话用户
     * @param request 资料字段
     * @return 保存后的资料（含生日）
     */
    UserProfile save(long userId, UserProfileUpdateRequest request);

    /**
     * 上传头像：魔数判定类型、大小上限 2 MB，写新文件后更新地址并尽力删除旧文件。
     *
     * @param userId 会话用户
     * @param file   multipart 文件（字段名 {@code file}）
     * @return 含新 {@code avatar_url} 的资料
     */
    UserProfile uploadAvatar(long userId, MultipartFile file);

    /**
     * 读取当前头像；用户不存在、未上传或文件缺失都为空（对外 404）。
     *
     * @param userId 用户 id
     * @return 图片字节与内容类型
     */
    Optional<AvatarFile> loadAvatar(long userId);
}