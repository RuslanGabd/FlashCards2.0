package card.flash.service;

import card.flash.dto.PdfTextResponse;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@Service
public class PdfTextExtractionService {

    private static final long MAX_PDF_BYTES = 10L * 1024 * 1024;
    private static final int MAX_PAGES = 300;
    private static final int MAX_TEXT_LENGTH = 1_000_000;

    public PdfTextResponse extract(MultipartFile file) {
        validate(file);

        try (PDDocument document = Loader.loadPDF(file.getBytes())) {
            int pageCount = document.getNumberOfPages();
            if (pageCount > MAX_PAGES) {
                throw new IllegalArgumentException("PDF contains more than " + MAX_PAGES + " pages");
            }

            String text = new PDFTextStripper().getText(document)
                    .replace('\u0000', ' ')
                    .replaceAll("[\\t\\x0B\\f\\r ]+", " ")
                    .replaceAll(" *\\n *", "\n")
                    .replaceAll("\\n{3,}", "\n\n")
                    .trim();
            if (text.isBlank()) {
                throw new IllegalArgumentException(
                        "No text found in PDF. The file may contain scanned images and require OCR"
                );
            }
            if (text.length() > MAX_TEXT_LENGTH) {
                throw new IllegalArgumentException("Extracted PDF text is too long");
            }

            return new PdfTextResponse(safeFileName(file.getOriginalFilename()), pageCount, text);
        } catch (IOException exception) {
            throw new IllegalArgumentException("Could not read PDF file", exception);
        }
    }

    private void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Choose a non-empty PDF file");
        }
        if (file.getSize() > MAX_PDF_BYTES) {
            throw new IllegalArgumentException("PDF file must not exceed 10 MB");
        }

        try {
            byte[] header = file.getInputStream().readNBytes(5);
            if (!"%PDF-".equals(new String(header, StandardCharsets.US_ASCII))) {
                throw new IllegalArgumentException("Uploaded file is not a valid PDF");
            }
        } catch (IOException exception) {
            throw new IllegalArgumentException("Could not read uploaded file", exception);
        }
    }

    private String safeFileName(String fileName) {
        if (fileName == null || fileName.isBlank()) return "document.pdf";
        return fileName.replace('\\', '/').replaceAll("^.*/", "");
    }
}
