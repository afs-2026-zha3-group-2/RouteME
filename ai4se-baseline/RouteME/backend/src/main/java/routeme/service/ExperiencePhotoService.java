package routeme.service;

import java.util.Optional;

import com.baomidou.mybatisplus.spring.service.IService;

import org.springframework.web.multipart.MultipartFile;

import routeme.entity.TripExperiencePhotoEntity;
import routeme.pojo.ExperiencePhotoFile;
import routeme.response.ExperiencePhotoResponse;

/**
 * 游后体验图片：先上传取得引用，再随体验提交按顺序绑定。
 */
public interface ExperiencePhotoService extends IService<TripExperiencePhotoEntity> {

    /** 同一用户对同一行程最多保留的图片数（含已绑定与未绑定）。 */
    int MAX_PHOTOS = 6;

    /**
     * 上传一张体验图片。
     *
     * @param tripId   行程 id，必须已结束且当前用户具备分享资格
     * @param authorId 上传者 id
     * @param file     multipart 文件
     * @return 图片引用（id 与只读地址）
     */
    ExperiencePhotoResponse upload(long tripId, long authorId, MultipartFile file);

    /**
     * 读取图片字节。
     *
     * @param photoId 图片 id
     * @return 行不存在或文件缺失时为空
     */
    Optional<ExperiencePhotoFile> load(long photoId);
}
