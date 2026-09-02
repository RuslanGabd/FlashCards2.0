package card.flash.controller;

import card.flash.dto.PdfTextResponse;
import card.flash.service.PdfTextExtractionService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    private final PdfTextExtractionService pdfTextExtractionService;

    public DocumentController(PdfTextExtractionService pdfTextExtractionService) {
        this.pdfTextExtractionService = pdfTextExtractionService;
    }

    @PostMapping(value = "/pdf-text", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public PdfTextResponse extractPdfText(@RequestPart("file") MultipartFile file) {
        return pdfTextExtractionService.extract(file);
    }
}
