package routeme.utils;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

import routeme.exception.InvalidInputException;

/**
 * 字节级剥离图片元数据，不引入第三方图像库。
 *
 * <p>JPEG 丢弃 APP1（EXIF / XMP）、APP13（IPTC）与 COM；PNG 丢弃
 * eXIf / tEXt / iTXt / zTXt / tIME；WebP 丢弃 EXIF / XMP chunk 并清除
 * VP8X 的对应 flag。结构不合法时拒绝，调用方不应落盘。</p>
 */
public final class PhotoMetadataStripper {

    private static final byte[] PNG_SIGNATURE = {
            (byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A
    };

    private PhotoMetadataStripper() {
    }

    public static byte[] strip(byte[] content, PhotoMagic.Format format) {
        if (content == null || content.length == 0 || format == null) {
            throw invalid("photo content is required");
        }
        return switch (format) {
            case JPEG -> stripJpeg(content);
            case PNG -> stripPng(content);
            case WEBP -> stripWebp(content);
        };
    }

    private static byte[] stripJpeg(byte[] content) {
        if (content.length < 4 || (content[0] & 0xFF) != 0xFF || (content[1] & 0xFF) != 0xD8) {
            throw invalid("jpeg must start with SOI");
        }
        ByteArrayOutputStream out = new ByteArrayOutputStream(content.length);
        out.write(content, 0, 2);
        int position = 2;
        boolean sawImageData = false;
        while (position + 1 < content.length) {
            if ((content[position] & 0xFF) != 0xFF) {
                throw invalid("jpeg segment marker expected");
            }
            int marker = content[position + 1] & 0xFF;
            if (marker == 0xD9) {
                out.write(content, position, 2);
                position += 2;
                sawImageData = true;
                break;
            }
            if (marker == 0xDA) {
                out.write(content, position, content.length - position);
                position = content.length;
                sawImageData = true;
                break;
            }
            if (marker == 0x01 || (marker >= 0xD0 && marker <= 0xD7)) {
                out.write(content, position, 2);
                position += 2;
                continue;
            }
            if (position + 4 > content.length) {
                throw invalid("truncated jpeg segment");
            }
            int length = ((content[position + 2] & 0xFF) << 8) | (content[position + 3] & 0xFF);
            if (length < 2 || position + 2 + length > content.length) {
                throw invalid("invalid jpeg segment length");
            }
            boolean drop = marker == 0xE1 || marker == 0xED || marker == 0xFE;
            if (!drop) {
                out.write(content, position, 2 + length);
            }
            position += 2 + length;
        }
        if (!sawImageData) {
            throw invalid("jpeg has no image data");
        }
        return out.toByteArray();
    }

    private static byte[] stripPng(byte[] content) {
        if (content.length < PNG_SIGNATURE.length + 12
                || !Arrays.equals(Arrays.copyOf(content, PNG_SIGNATURE.length), PNG_SIGNATURE)) {
            throw invalid("png signature is invalid");
        }
        ByteArrayOutputStream out = new ByteArrayOutputStream(content.length);
        out.write(content, 0, PNG_SIGNATURE.length);
        int position = PNG_SIGNATURE.length;
        boolean sawEnd = false;
        while (position + 12 <= content.length) {
            long length = readUint32BigEndian(content, position);
            if (length > Integer.MAX_VALUE - 12 || position + 12 + length > content.length) {
                throw invalid("invalid png chunk length");
            }
            String type = new String(content, position + 4, 4, StandardCharsets.US_ASCII);
            int total = 12 + (int) length;
            boolean drop = type.equals("eXIf")
                    || type.equals("tEXt")
                    || type.equals("iTXt")
                    || type.equals("zTXt")
                    || type.equals("tIME");
            if (!drop) {
                out.write(content, position, total);
            }
            position += total;
            if (type.equals("IEND")) {
                sawEnd = true;
                break;
            }
        }
        if (!sawEnd) {
            throw invalid("png has no IEND chunk");
        }
        return out.toByteArray();
    }

    private static byte[] stripWebp(byte[] content) {
        if (content.length < 12
                || content[0] != 'R' || content[1] != 'I' || content[2] != 'F' || content[3] != 'F'
                || content[8] != 'W' || content[9] != 'E' || content[10] != 'B' || content[11] != 'P') {
            throw invalid("webp header is invalid");
        }
        ByteArrayOutputStream body = new ByteArrayOutputStream(content.length);
        int position = 12;
        while (position + 8 <= content.length) {
            String fourCc = new String(content, position, 4, StandardCharsets.US_ASCII);
            long size = readUint32LittleEndian(content, position + 4);
            if (size > Integer.MAX_VALUE) {
                throw invalid("invalid webp chunk size");
            }
            int total = 8 + (int) size + ((size & 1) == 1 ? 1 : 0);
            if (position + total > content.length) {
                throw invalid("truncated webp chunk");
            }
            if (fourCc.equals("EXIF") || fourCc.equals("XMP ")) {
                position += total;
                continue;
            }
            if (fourCc.equals("VP8X") && size >= 1) {
                byte[] chunk = Arrays.copyOfRange(content, position, position + total);
                chunk[8] = (byte) (chunk[8] & ~0x0C);
                body.write(chunk, 0, chunk.length);
            } else {
                body.write(content, position, total);
            }
            position += total;
        }
        byte[] bodyBytes = body.toByteArray();
        ByteArrayOutputStream out = new ByteArrayOutputStream(12 + bodyBytes.length);
        out.write('R');
        out.write('I');
        out.write('F');
        out.write('F');
        writeUint32LittleEndian(out, 4 + bodyBytes.length);
        out.write('W');
        out.write('E');
        out.write('B');
        out.write('P');
        out.write(bodyBytes, 0, bodyBytes.length);
        return out.toByteArray();
    }

    private static long readUint32BigEndian(byte[] content, int offset) {
        return ((long) (content[offset] & 0xFF) << 24)
                | ((long) (content[offset + 1] & 0xFF) << 16)
                | ((long) (content[offset + 2] & 0xFF) << 8)
                | (content[offset + 3] & 0xFF);
    }

    private static long readUint32LittleEndian(byte[] content, int offset) {
        return (content[offset] & 0xFFL)
                | ((long) (content[offset + 1] & 0xFF) << 8)
                | ((long) (content[offset + 2] & 0xFF) << 16)
                | ((long) (content[offset + 3] & 0xFF) << 24);
    }

    private static void writeUint32LittleEndian(ByteArrayOutputStream out, long value) {
        out.write((int) (value & 0xFF));
        out.write((int) ((value >> 8) & 0xFF));
        out.write((int) ((value >> 16) & 0xFF));
        out.write((int) ((value >> 24) & 0xFF));
    }

    private static InvalidInputException invalid(String message) {
        return new InvalidInputException(message);
    }
}
