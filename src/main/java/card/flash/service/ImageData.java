package card.flash.service;

import java.util.Base64;

/** Only small raster data URLs are accepted; arbitrary URLs and SVG are not stored. */
public final class ImageData {
    private ImageData() {}
    public static String validate(String image) {
        if (image == null || image.isEmpty()) return "";
        if (image.length() > 300_000 || !image.matches("data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+"))
            throw new IllegalArgumentException("Use a PNG, JPEG or WebP image smaller than 220 KB");
        byte[] data;
        try { data = Base64.getDecoder().decode(image.substring(image.indexOf(',') + 1)); }
        catch (IllegalArgumentException error) { throw new IllegalArgumentException("Invalid image data"); }
        boolean png = data.length > 8 && data[0] == (byte) 137 && data[1] == 80 && data[2] == 78 && data[3] == 71
                && data[4] == 13 && data[5] == 10 && data[6] == 26 && data[7] == 10;
        boolean jpeg = data.length > 3 && data[0] == (byte) 255 && data[1] == (byte) 216 && data[2] == (byte) 255;
        boolean webp = data.length > 12 && new String(data, 0, 4, java.nio.charset.StandardCharsets.US_ASCII).equals("RIFF")
                && new String(data, 8, 4, java.nio.charset.StandardCharsets.US_ASCII).equals("WEBP");
        if (!(image.startsWith("data:image/png;") && png || image.startsWith("data:image/jpeg;") && jpeg
                || image.startsWith("data:image/webp;") && webp)) throw new IllegalArgumentException("Invalid raster image");
        return image;
    }
}
