package routeme.utils;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;

import org.junit.jupiter.api.Test;

import routeme.exception.InvalidInputException;

class PhotoMetadataStripperTest {

    private static final byte[] PNG_SIGNATURE = {
            (byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A
    };

    @Test
    void in_jpegWithExifAndComment_out_imageWithoutMetadata() {
        // Given
        byte[] original = jpeg();

        // When
        byte[] stripped = PhotoMetadataStripper.strip(original, PhotoMagic.Format.JPEG);

        // Then
        assertFalse(contains(stripped, ascii("Exif")), "exif payload removed");
        assertFalse(contains(stripped, ascii("secret")), "comment removed");
        assertTrue(contains(stripped, ascii("JFIF")), "app0 kept");
        assertTrue(contains(stripped, new byte[]{(byte) 0xFF, (byte) 0xDA, 1, 2, 3, 4}), "image data kept");
    }

    @Test
    void in_pngWithTextChunks_out_imageWithoutMetadata() {
        // Given
        byte[] original = png();

        // When
        byte[] stripped = PhotoMetadataStripper.strip(original, PhotoMagic.Format.PNG);

        // Then
        assertFalse(contains(stripped, ascii("eXIf")), "exif chunk removed");
        assertFalse(contains(stripped, ascii("tEXt")), "text chunk removed");
        assertTrue(contains(stripped, ascii("IHDR")), "header kept");
        assertTrue(contains(stripped, ascii("IDAT")), "image data kept");
        assertTrue(contains(stripped, ascii("IEND")), "end kept");
    }

    @Test
    void in_webpWithExifChunk_out_chunkRemovedAndVp8xFlagsCleared() {
        // Given
        byte[] original = webp();

        // When
        byte[] stripped = PhotoMetadataStripper.strip(original, PhotoMagic.Format.WEBP);

        // Then
        assertFalse(contains(stripped, ascii("EXIF")), "exif chunk removed");
        assertTrue(contains(stripped, ascii("VP8 ")), "image chunk kept");
        assertEquals(0, vp8xFlags(stripped), "vp8x exif/xmp flags cleared");
        assertEquals(readUint32LittleEndian(stripped, 4), stripped.length - 8, "riff size rewritten");
    }

    @Test
    void in_brokenStructures_out_invalidInput() {
        assertThrows(InvalidInputException.class,
                () -> PhotoMetadataStripper.strip(new byte[]{(byte) 0xFF, (byte) 0xD8, 0x00, 0x00},
                        PhotoMagic.Format.JPEG));
        assertThrows(InvalidInputException.class,
                () -> PhotoMetadataStripper.strip(concat(PNG_SIGNATURE, new byte[]{0, 0, 0x10, 0}), PhotoMagic.Format.PNG));
        assertThrows(InvalidInputException.class,
                () -> PhotoMetadataStripper.strip(ascii("RIFFxxxxWEBQ"), PhotoMagic.Format.WEBP));
        assertThrows(InvalidInputException.class,
                () -> PhotoMetadataStripper.strip(null, PhotoMagic.Format.PNG));
    }

    private byte[] jpeg() {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.write(0xFF);
        out.write(0xD8);
        writeSegment(out, 0xE0, ascii("JFIF\u0000"));
        writeSegment(out, 0xE1, concat(ascii("Exif\u0000\u0000GPS-LATITUDE")));
        writeSegment(out, 0xFE, ascii("secret"));
        out.write(0xFF);
        out.write(0xDA);
        out.write(new byte[]{1, 2, 3, 4}, 0, 4);
        return out.toByteArray();
    }

    private byte[] png() {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.write(PNG_SIGNATURE, 0, PNG_SIGNATURE.length);
        writeChunk(out, "IHDR", new byte[]{0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0});
        writeChunk(out, "eXIf", ascii("Exif\u0000\u0000GPS"));
        writeChunk(out, "tEXt", ascii("Author\u0000me"));
        writeChunk(out, "IDAT", new byte[]{1, 2, 3});
        writeChunk(out, "IEND", new byte[0]);
        return out.toByteArray();
    }

    private byte[] webp() {
        ByteArrayOutputStream chunks = new ByteArrayOutputStream();
        byte[] vp8x = new byte[10];
        vp8x[0] = 0x0C;
        writeChunkLittleEndian(chunks, "VP8X", vp8x);
        writeChunkLittleEndian(chunks, "EXIF", ascii("Exif\u0000\u0000GPS"));
        writeChunkLittleEndian(chunks, "VP8 ", new byte[]{1, 2, 3, 4});
        byte[] body = chunks.toByteArray();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.write(ascii("RIFF"), 0, 4);
        writeUint32LittleEndian(out, 4 + body.length);
        out.write(ascii("WEBP"), 0, 4);
        out.write(body, 0, body.length);
        return out.toByteArray();
    }

    private void writeSegment(ByteArrayOutputStream out, int marker, byte[] payload) {
        int length = payload.length + 2;
        out.write(0xFF);
        out.write(marker);
        out.write((length >> 8) & 0xFF);
        out.write(length & 0xFF);
        out.write(payload, 0, payload.length);
    }

    private void writeChunk(ByteArrayOutputStream out, String type, byte[] data) {
        writeUint32BigEndian(out, data.length);
        out.write(ascii(type), 0, 4);
        out.write(data, 0, data.length);
        out.write(new byte[]{0, 0, 0, 0}, 0, 4);
    }

    private void writeChunkLittleEndian(ByteArrayOutputStream out, String type, byte[] data) {
        out.write(ascii(type), 0, 4);
        writeUint32LittleEndian(out, data.length);
        out.write(data, 0, data.length);
        if ((data.length & 1) == 1) {
            out.write(0);
        }
    }

    private void writeUint32BigEndian(ByteArrayOutputStream out, long value) {
        out.write((int) ((value >> 24) & 0xFF));
        out.write((int) ((value >> 16) & 0xFF));
        out.write((int) ((value >> 8) & 0xFF));
        out.write((int) (value & 0xFF));
    }

    private void writeUint32LittleEndian(ByteArrayOutputStream out, long value) {
        out.write((int) (value & 0xFF));
        out.write((int) ((value >> 8) & 0xFF));
        out.write((int) ((value >> 16) & 0xFF));
        out.write((int) ((value >> 24) & 0xFF));
    }

    private long readUint32LittleEndian(byte[] content, int offset) {
        return (content[offset] & 0xFFL)
                | ((long) (content[offset + 1] & 0xFF) << 8)
                | ((long) (content[offset + 2] & 0xFF) << 16)
                | ((long) (content[offset + 3] & 0xFF) << 24);
    }

    private int vp8xFlags(byte[] content) {
        int position = 12;
        while (position + 8 <= content.length) {
            String fourCc = new String(content, position, 4, StandardCharsets.US_ASCII);
            int size = (int) readUint32LittleEndian(content, position + 4);
            if (fourCc.equals("VP8X")) {
                return content[position + 8] & 0xFF;
            }
            position += 8 + size + ((size & 1) == 1 ? 1 : 0);
        }
        throw new AssertionError("VP8X chunk not found");
    }

    private boolean contains(byte[] content, byte[] needle) {
        outer:
        for (int i = 0; i + needle.length <= content.length; i++) {
            for (int j = 0; j < needle.length; j++) {
                if (content[i + j] != needle[j]) {
                    continue outer;
                }
            }
            return true;
        }
        return false;
    }

    private byte[] concat(byte[]... parts) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        for (byte[] part : parts) {
            out.write(part, 0, part.length);
        }
        return out.toByteArray();
    }

    private byte[] ascii(String value) {
        return value.getBytes(StandardCharsets.ISO_8859_1);
    }
}
