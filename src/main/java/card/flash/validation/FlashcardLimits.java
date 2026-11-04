package card.flash.validation;

/** Collection-wide limits shared by every write operation. */
public final class FlashcardLimits {
    public static final int MAX_CARDS = 500;
    public static final long MAX_IMAGE_CHARACTERS = 2_000_000;

    private FlashcardLimits() {}

    public static void validate(int count, long imageCharacters) {
        if (count < 1 || count > MAX_CARDS) {
            throw new IllegalArgumentException("A set must contain between 1 and " + MAX_CARDS + " cards");
        }
        if (imageCharacters > MAX_IMAGE_CHARACTERS) {
            throw new IllegalArgumentException("Images in one set must total less than 2 MB");
        }
    }
}
