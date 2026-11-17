import { useState, type CSSProperties } from 'react';

// 色相取自品牌色族：松石绿 / 珊瑚橙 / 海军蓝 / Jade / 天蓝 / 琥珀
const HUES = [174, 18, 210, 152, 199, 42];

type AvatarUser = {
  id: number;
  avatar_initial: string;
  avatar_url?: string | null;
};

type Props = {
  user: AvatarUser;
  size?: 'sm' | 'lg' | 'xl';
};

/**
 * 头像：有 `avatar_url` 时渲染图片，否则回退昵称首字（色相由用户 id 派生）。
 * 图片加载失败同样回退首字，任何展示位都不留空框。
 */
export function Avatar({ user, size }: Props) {
  const hue = HUES[Math.abs(user.id) % HUES.length];
  const className = size === undefined ? 'avatar' : `avatar ${size}`;
  const url = user.avatar_url ?? '';
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = url !== '' && failedUrl !== url;

  return (
    <span
      className={className}
      style={{ '--hue': String(hue) } as CSSProperties}
      aria-hidden="true"
    >
      {showImage ? (
        <img
          className="avatar-img"
          src={url}
          alt=""
          loading="lazy"
          onError={() => setFailedUrl(url)}
        />
      ) : (
        user.avatar_initial
      )}
    </span>
  );
}