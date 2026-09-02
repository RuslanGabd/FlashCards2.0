package card.flash;

import card.flash.entity.User;
import card.flash.repository.UserRepository;
import card.flash.security.JwtUtil;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PdfTextIntegrationTests {

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired JwtUtil jwtUtil;

    @Test
    void authenticatedUserCanExtractTextFromPdf() throws Exception {
        User user = user("pdf_reader");
        MockMultipartFile file = new MockMultipartFile(
                "file", "lesson.pdf", "application/pdf", pdfWithText("English vocabulary lesson")
        );

        mockMvc.perform(multipart("/api/documents/pdf-text")
                        .file(file)
                        .header("Authorization", "Bearer " + jwtUtil.generateToken(user.getUsername())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fileName").value("lesson.pdf"))
                .andExpect(jsonPath("$.pageCount").value(1))
                .andExpect(jsonPath("$.text").value("English vocabulary lesson"));
    }

    @Test
    void anonymousPdfUploadIsRejected() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "lesson.pdf", "application/pdf", pdfWithText("Some text")
        );

        mockMvc.perform(multipart("/api/documents/pdf-text").file(file))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    private byte[] pdfWithText(String text) throws Exception {
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            PDPage page = new PDPage();
            document.addPage(page);
            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                content.beginText();
                content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                content.newLineAtOffset(72, 720);
                content.showText(text);
                content.endText();
            }
            document.save(output);
            return output.toByteArray();
        }
    }

    private User user(String username) {
        User user = new User();
        user.setUsername(username);
        user.setEmail(username + "@example.com");
        user.setPassword(passwordEncoder.encode("password123"));
        return userRepository.save(user);
    }
}
