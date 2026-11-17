package routeme.utils;

/**
 * 体验图片格式嗅探：只看魔数，不信任声明的 Content-Type 与原始文件名。
 */
public final class PhotoMagic {

    public static final int MAX_BYTES = 5 * 1024 * 1024;

    private PhotoMagic() {
    }

    public enum Format {
        JPEG("jpg", "image/jpeg"),
        PNG("png", "image/png"),
        WEBP("webp", "image/webp");

        private final String extension;
        private final String mime;

        Format(String extension, String mime) {
            this.extension = extension;
            this.mime = mime;
        }

        public String extension() {
            return extension;
        }

        public String mime() {
            return mime;
        }
    }

    /**
     * @param content 文件字节
     * @return JPEG / PNG / WebP；不在允许范围时为空
     */
    public static Format detect(byte[] content) {
        if (content == null) {
            return null;
        }
        if (content.length >= 3
                && (content[0] & 0xFF) == 0xFF
                && (content[1] & 0xFF) == 0xD8
                && (content[2] & 0xFF) == 0xFF) {
            return Format.JPEG;
        }
        if (content.length >= 4
                && (content[0] & 0xFF) == 0x89
                && content[1] == 'P'
                && content[2] == 'N'
                && content[3] == 'G') {
            return Format.PNG;
        }
        if (content.length >= 12
                && content[0] == 'R'
                && content[1] == 'I'
                && content[2] == 'F'
                && content[3] == 'F'
                && content[8] == 'W'
                && content[9] == 'E'
                && content[10] == 'B'
                && content[11] == 'P') {
            return Format.WEBP;
        }
        return null;
    }
}
