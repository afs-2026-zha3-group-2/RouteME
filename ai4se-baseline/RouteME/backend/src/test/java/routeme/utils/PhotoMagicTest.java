package routeme.utils;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;

class PhotoMagicTest {

    @Test
    void in_jpegSoi_out_jpegFormat() {
        assertEquals(PhotoMagic.Format.JPEG, PhotoMagic.detect(new byte[]{
                (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0x00, 0x10
        }));
    }

    @Test
    void in_pngSignature_out_pngFormat() {
        assertEquals(PhotoMagic.Format.PNG, PhotoMagic.detect(new byte[]{
                (byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A
        }));
    }

    @Test
    void in_webpRiff_out_webpFormat() {
        assertEquals(PhotoMagic.Format.WEBP, PhotoMagic.detect(new byte[]{
                'R', 'I', 'F', 'F', 0x10, 0x00, 0x00, 0x00, 'W', 'E', 'B', 'P'
        }));
    }

    @Test
    void in_otherOrDisguisedContent_out_null() {
        assertNull(PhotoMagic.detect("GIF89a".getBytes()));
        assertNull(PhotoMagic.detect(new byte[]{'%', 'P', 'D', 'F'}));
        assertNull(PhotoMagic.detect(new byte[]{0x00, 0x01, 0x02}));
        assertNull(PhotoMagic.detect(new byte[0]));
        assertNull(PhotoMagic.detect(null));
    }
}
