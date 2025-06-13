import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import axios from 'axios';
import FormData from 'form-data';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import archiver from 'archiver';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Store chat histories in memory (in a production app, you'd use a database)
const chatHistories = {};

// OpenAI API key
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
// Enhance user prompt with more details
app.post('/api/enhance-prompt', async (req, res) => {
  try {
    const { prompt, sessionId } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    // Call OpenAI API to enhance the prompt
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: "system",
            content: "You are an expert web designer who helps users create detailed specifications for web pages. Your job is to take a user's general request and expand it into a comprehensive, detailed description that can be used to generate high-quality HTML/CSS/JavaScript. If the webpage the user intends to build needs information, provide that information. For examples, if the user wants to build a webpage for a company, provide information about the company such as the name, industry, location, specialities, products and a description of the company. If the webpage the user intended to build is a personal website, let's make the design more free and fun. If user intends to build some web component technical to verify some idea, keep the styling minimum.\n\nImportant: When detailing layout and styling, refer to the Mann+Hummel design system which includes:\n- Primary color palette: green (#00823c), light green (#46af28) - Use these colors only for buttons, highlights, and accents (not for regular text)\n- Black color palette: black (#000000), dark gray (#212121), medium gray (#333333) - Use these for all regular text and headings\n- Secondary accent colors: orange (#ff7300) and red (#c80f2d) - Use these sparingly for calls to action or special highlights\n- White header with the Mann+Hummel logo on the left side\n- Company images available in /assets/company/images/ folder (image(1).jpeg through image(8).jpeg) with specific CSS classes for different purposes\n- Typography using Gotham font family with different weights (light, book, medium, bold) and styles (regular and narrow)\n- Components like company-styled buttons, forms, cards, headers and footers\n\nPlease also include specific details about layout, color schemes, functionality, content sections, and styling according to the webpage the user intends to build. Be creative but practical. Your enhanced prompt should be 2 paragraphs long and specific."          
          },
          {
            role: "user",
            content: `Enhance this brief web page request into a detailed specification: "${prompt}"`
          }
        ],
        max_tokens: 2000
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }
    
    // Get the enhanced prompt
    const enhancedPrompt = data.choices[0].message.content;
    
    // Store the original and enhanced prompts in session storage
    if (!chatHistories[sessionId]) {
      chatHistories[sessionId] = [
        {
          role: "system",
          content: "You are an expert HTML/CSS/JavaScript developer. Generate code based on the user's instructions. Please keep all the info the user provided, and put them on the webpage content. **Guidelines for producing high quality HTML:**\n\n1. **HTML Structure:** Use a complete HTML5 template with `<!DOCTYPE html>`, `<html>`, `<head>` (with meta tags for responsive design), and `<body>`.\n\n2. **Design System Integration:** **MANDATORY REQUIREMENT:** You MUST import and use the company design system CSS file by adding this line in the head section: `<link rel=\"stylesheet\" href=\"/assets/company/company-design-system.css\">`\n\n3. **Mann+Hummel Brand Colors:** **MANDATORY REQUIREMENT:** Use ONLY the official Mann+Hummel brand colors defined in the CSS as variables:\n   - Primary Colors: --company-green (#00823c), --company-light-green (#46af28)\n   - Blacks: --company-black-100 (#000000), --company-black-95 (#212121), --company-black-90 (#333333)\n   - Accent Colors: --company-orange (#ff7300), --company-red (#c80f2d)\n   - Additional: --company-light (#F5F5F5), --company-white (#FFFFFF)\n   Apply these using the CSS variables like `var(--company-green)` or using the helper classes.\n\n4. **Logo and Branding:** **MANDATORY REQUIREMENT:** The header MUST include the Mann+Hummel logo on the left side using: `<div class=\"company-logo-container\"><img class=\"company-logo\" src=\"/assets/company/logos/mann-hummel-logo.png\" alt=\"MANN+HUMMEL logo\"></div>`. The header should have a white background.\n\n5. **Company Images:** **MANDATORY REQUIREMENT:** When images are needed, select appropriate ones from the company-provided images in the /assets/company/images/ folder. Available images are image(1).jpeg through image(8).jpeg. You don't need to use all images, but when you need an image, use these instead of external or placeholder images. Apply the appropriate CSS classes based on the image's purpose:\n   - Standard image: `<img src=\"/assets/company/images/image(1).jpeg\" alt=\"Mann+Hummel company image\" class=\"company-image\">`\n   - Hero/banner image: `<img src=\"/assets/company/images/image(2).jpeg\" alt=\"Mann+Hummel hero image\" class=\"company-image-hero\">`\n   - Thumbnail: `<img src=\"/assets/company/images/image(3).jpeg\" alt=\"Mann+Hummel thumbnail\" class=\"company-image-thumbnail\">`\n   - Round profile image: `<img src=\"/assets/company/images/image(4).jpeg\" alt=\"Mann+Hummel profile\" class=\"company-image-rounded\">`\n   - Feature image: `<img src=\"/assets/company/images/image(5).jpeg\" alt=\"Mann+Hummel feature\" class=\"company-image-feature\">`\n   - Image gallery: Wrap images in a `<div class=\"company-gallery\">` container\n\n6. **For everything else:** You have creative freedom to design the page as you see fit, including layout, typography, component styling, and design approach. There are no restrictions on these aspects.\n\n**IMPORTANT:** Your entire response must be ONLY the raw HTML code without any explanation, markdown formatting, or comments to the user. Your response MUST be a complete HTML document starting with <!DOCTYPE html> and ending with </html>. Do not include ANY text before or after the HTML document."
        }      ];
    }
    
    // Store the original prompt for reference
    chatHistories[sessionId].originalPrompt = prompt;
    
    res.json({ 
      originalPrompt: prompt,
      enhancedPrompt: enhancedPrompt
    });
    
  } catch (error) {
    console.error('Error enhancing prompt:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate HTML from natural language
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt, sessionId, isEnhancedPrompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    // Initialize chat history for this session if it doesn't exist
    if (!chatHistories[sessionId]) {
      chatHistories[sessionId] = [
        {
          role: "system",
          content: "You are an expert HTML/CSS/JavaScript developer. Generate code based on the user's instructions. Please keep all the info the user provided, and put them on the webpage content. **Guidelines for producing high quality HTML:**\n\n1. **HTML Structure:** Use a complete HTML5 template with `<!DOCTYPE html>`, `<html>`, `<head>` (with meta tags for responsive design), and `<body>`.\n\n2. **Design System Integration:** **MANDATORY REQUIREMENT:** You MUST import and use the company design system CSS file by adding this line in the head section: `<link rel=\"stylesheet\" href=\"/assets/company/company-design-system.css\">`\n\n3. **Mann+Hummel Brand Colors:** **MANDATORY REQUIREMENT:** Use ONLY the official Mann+Hummel brand colors defined in the CSS as variables:\n   - Primary Colors: --company-green (#00823c), --company-light-green (#46af28)\n   - Blacks: --company-black-100 (#000000), --company-black-95 (#212121), --company-black-90 (#333333)\n   - Accent Colors: --company-orange (#ff7300), --company-red (#c80f2d)\n   - Additional: --company-light (#F5F5F5), --company-white (#FFFFFF)\n   Apply these using the CSS variables like `var(--company-green)` or using the helper classes.\n\n4. **Logo and Branding:** **MANDATORY REQUIREMENT:** The header MUST include the Mann+Hummel logo on the left side using: `<div class=\"company-logo-container\"><img class=\"company-logo\" src=\"/assets/company/logos/mann-hummel-logo.png\" alt=\"MANN+HUMMEL logo\"></div>`. The header should have a white background.\n\n5. **Company Images:** **MANDATORY REQUIREMENT:** When images are needed, select appropriate ones from the company-provided images in the /assets/company/images/ folder. Available images are image(1).jpeg through image(8).jpeg. You don't need to use all images, but when you need an image, use these instead of external or placeholder images. Apply the appropriate CSS classes based on the image's purpose:\n   - Standard image: `<img src=\"/assets/company/images/image(1).jpeg\" alt=\"Mann+Hummel company image\" class=\"company-image\">`\n   - Hero/banner image: `<img src=\"/assets/company/images/image(2).jpeg\" alt=\"Mann+Hummel hero image\" class=\"company-image-hero\">`\n   - Thumbnail: `<img src=\"/assets/company/images/image(3).jpeg\" alt=\"Mann+Hummel thumbnail\" class=\"company-image-thumbnail\">`\n   - Round profile image: `<img src=\"/assets/company/images/image(4).jpeg\" alt=\"Mann+Hummel profile\" class=\"company-image-rounded\">`\n   - Feature image: `<img src=\"/assets/company/images/image(5).jpeg\" alt=\"Mann+Hummel feature\" class=\"company-image-feature\">`\n   - Image gallery: Wrap images in a `<div class=\"company-gallery\">` container\n\n6. **For everything else:** You have creative freedom to design the page as you see fit, including layout, typography, component styling, and design approach. There are no restrictions on these aspects.\n\n**IMPORTANT:** Your entire response must be ONLY the raw HTML code without any explanation, markdown formatting, or comments to the user. Your response MUST be a complete HTML document starting with <!DOCTYPE html> and ending with </html>. Do not include ANY text before or after the HTML document."
        }
      ];
    }
    
    // If this is an enhanced prompt, add both the original and enhanced prompts to the chat history
    if (isEnhancedPrompt && chatHistories[sessionId].originalPrompt) {
      chatHistories[sessionId].push({
        role: "user",
        content: `Original request: ${chatHistories[sessionId].originalPrompt}\n\nDetailed specification: ${prompt}\n\nPlease provide ONLY a complete HTML document starting with <!DOCTYPE html> and ending with </html>. Do not include ANY text before or after the HTML.`
      });
    } else {
      // Add the user's prompt to the chat history
      chatHistories[sessionId].push({
        role: "user",
        content: `${prompt}\n\nPlease provide ONLY a complete HTML document starting with <!DOCTYPE html> and ending with </html>. Do not include ANY text before or after the HTML.`
      });
    }
    
    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'o4-mini',
        messages: chatHistories[sessionId],
        reasoning_effort: "medium",
        max_completion_tokens: 40000
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }
    
    // Get the generated code and clean it by removing markdown code block indicators
    let generatedCode = data.choices[0].message.content;
    
    // Remove markdown code block indicators if present
    generatedCode = generatedCode.replace(/^```html\s*/i, '');
    generatedCode = generatedCode.replace(/^```\s*/i, '');
    generatedCode = generatedCode.replace(/\s*```$/i, '');
    
    // Extract only the HTML document
    const doctypeMatch = generatedCode.match(/<!DOCTYPE html>[\s\S]*/i);
    if (doctypeMatch) {
      generatedCode = doctypeMatch[0];
    }
    
    // If there's text after </html>, remove it
    const htmlEndMatch = generatedCode.match(/([\s\S]*<\/html>)/i);
    if (htmlEndMatch) {
      generatedCode = htmlEndMatch[1];
    }
    
    // Add validation to ensure we have a complete HTML document
    if (!generatedCode.includes('<!DOCTYPE html>') || !generatedCode.includes('</html>')) {
      // If not a complete document, wrap the response in a basic HTML structure
      if (!generatedCode.includes('<!DOCTYPE html>') && !generatedCode.includes('<html')) {
        generatedCode = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated Page</title>
</head>
<body>
    ${generatedCode}
</body>
</html>`;
      }
    }
    
    // Add the assistant's response to the chat history
    chatHistories[sessionId].push({
      role: "assistant",
      content: generatedCode
    });
    
    res.json({ 
      code: generatedCode,
      chatHistory: chatHistories[sessionId]
    });
    
  } catch (error) {
    console.error('Error generating code:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get chat history for a session
app.get('/api/history/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  
  if (!chatHistories[sessionId]) {
    return res.status(404).json({ error: 'Chat history not found' });
  }
  
  res.json({ chatHistory: chatHistories[sessionId] });
});

// Modify existing code based on new instructions
app.post('/api/modify', async (req, res) => {
  try {
    const { prompt, currentCode, sessionId } = req.body;
    
    if (!prompt || !currentCode) {
      return res.status(400).json({ error: 'Prompt and current code are required' });
    }
    
    // Initialize chat history for this session if it doesn't exist
    if (!chatHistories[sessionId]) {
      chatHistories[sessionId] = [
        {
          role: "system",
          content: "You are an expert HTML/CSS/JavaScript developer specializing in precise, targeted modifications to web pages. Your task is to modify ONLY the specific parts of the code that need to be changed based on the user's request, while preserving everything else exactly as is.\n\n**IMPORTANT GUIDELINES:**\n\n1. **Make Minimal Changes:** Only modify or add what is explicitly requested. Do not rewrite or restructure unrelated parts of the code.\n\n2. **Preserve Structure:** Maintain the existing HTML structure, class names, IDs, and overall organization unless specifically asked to change them.\n\n3. **Mann+Hummel Brand Colors:** If making style changes, use ONLY the official Mann+Hummel brand colors:\n   - Primary Colors: --company-green (#00823c), --company-light-green (#46af28)\n   - Blacks: --company-black-100 (#000000), --company-black-95 (#212121), --company-black-90 (#333333)\n   - Accent Colors: --company-orange (#ff7300), --company-red (#c80f2d)\n   - Additional: --company-light (#F5F5F5), --company-white (#FFFFFF)\n\n4. **Design System:** Always maintain or add the link to the company design system CSS: `<link rel=\"stylesheet\" href=\"/assets/company/company-design-system.css\">`\n\n5. **Header and Logo:** Ensure the header includes the Mann+Hummel logo on the left side: `<div class=\"company-logo-container\"><img class=\"company-logo\" src=\"/assets/company/logos/mann-hummel-logo.png\" alt=\"MANN+HUMMEL logo\"></div>`. The header should have a white background.\n\n6. **Company Images:** When adding or replacing images, select appropriate ones from the company-provided images in the /assets/company/images/ folder. Available images are image(1).jpeg through image(8).jpeg. You don't need to use all images, but when you need an image, use these instead of external or placeholder images.\n\n7. **For everything else:** You have creative freedom to implement changes as requested by the user, without additional restrictions.\n\n8. **Return Complete Code:** Always and only return the complete HTML document with your targeted changes applied.\n\n**IMPORTANT:** Your entire response must be ONLY the raw HTML code without any explanation, markdown formatting, or comments to the user. Do not include ANY text before or after the HTML document."
        }
      ];
    }
    
    // Add the current code to the chat history as an assistant message
    chatHistories[sessionId].push({
      role: "assistant",
      content: currentCode
    });
    
    // Add the user's modification request to the chat history
    chatHistories[sessionId].push({
      role: "user",
      content: `I need you to make a SPECIFIC change to the above HTML code. Please modify ONLY what I'm asking for and keep everything else exactly the same.\n\nRequested change: ${prompt}\n\nRemember: Only change what's needed for this specific request. Don't rewrite or restructure other parts of the code. **RETURN ONLY THE COMPLETE HTML DOCUMENT** with your targeted changes applied, starting with <!DOCTYPE html> and ending with </html>.\n\n**IMPORTANT:** Your entire response must be ONLY the raw HTML code without any explanation, markdown formatting, or comments to the user. Do not include ANY text before or after the HTML document.`
    });
    
    // Call OpenAI API with both the code and prompt
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'o4-mini',
        reasoning_effort: "medium",
        messages: chatHistories[sessionId],
        max_completion_tokens: 30000
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }
    
    // Get the modified code and clean it by removing markdown code block indicators
    let modifiedCode = data.choices[0].message.content;
    
    // Remove markdown code block indicators if present
    modifiedCode = modifiedCode.replace(/^```html\s*/i, '');
    modifiedCode = modifiedCode.replace(/^```\s*/i, '');
    modifiedCode = modifiedCode.replace(/\s*```$/i, '');
    
    // Extract only the HTML document
    const doctypeMatch = modifiedCode.match(/<!DOCTYPE html>[\s\S]*/i);
    if (doctypeMatch) {
      modifiedCode = doctypeMatch[0];
    }
    
    // If there's text after </html>, remove it
    const htmlEndMatch = modifiedCode.match(/([\s\S]*<\/html>)/i);
    if (htmlEndMatch) {
      modifiedCode = htmlEndMatch[1];
    }
    
    // Add validation to ensure we have a complete HTML document
    if (!modifiedCode.includes('<!DOCTYPE html>') || !modifiedCode.includes('</html>')) {
      // If not a complete document, wrap the response in a basic HTML structure
      if (!modifiedCode.includes('<!DOCTYPE html>') && !modifiedCode.includes('<html')) {
        modifiedCode = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated Page</title>
</head>
<body>
    ${modifiedCode}
</body>
</html>`;
      } else {
        // If it has some HTML structure but not complete, use the current code as a fallback
        console.error('Incomplete HTML returned from AI. Using original code as fallback.');
        modifiedCode = currentCode;
      }
    }
    
    // Add the assistant's response to the chat history
    chatHistories[sessionId].push({
      role: "assistant",
      content: modifiedCode
    });
    
    res.json({ 
      code: modifiedCode,
      chatHistory: chatHistories[sessionId]
    });
    
  } catch (error) {
    console.error('Error modifying code:', error);
    res.status(500).json({ error: error.message });
  }
});

// Remove the deploy to Netlify endpoint
app.post('/api/deploy', async (req, res) => {
  // Return a placeholder response since we're not implementing actual deployment
  res.status(501).json({ 
    error: 'Netlify deployment has been disabled in this version.'
  });
});

// Remove the test HTML creation endpoint
app.get('/api/create-test-html', (req, res) => {
  res.status(501).json({ 
    error: 'This feature has been disabled in this version.'
  });
});

// Endpoint to view the exported HTML
app.get('/api/view-exported-html', (req, res) => {
  try {
    const exportPath = path.join(__dirname, 'exported_html.html');
    if (fs.existsSync(exportPath)) {
      const htmlContent = fs.readFileSync(exportPath, 'utf8');
      res.send(htmlContent);
    } else {
      res.status(404).send('No exported HTML found');
    }
  } catch (error) {
    res.status(500).send('Error reading exported HTML: ' + error.message);
  }
});

// Export HTML code as a downloadable file
app.post('/api/export-html', (req, res) => {
  try {
    const { htmlContent } = req.body;
    
    if (!htmlContent) {
      return res.status(400).json({ error: 'HTML content is required' });
    }

    // Set headers for file download
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', 'attachment; filename=exported_page.html');
    
    // Send the HTML content
    res.send(htmlContent);

  } catch (error) {
    console.error('Error exporting HTML:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve static files from the client build directory in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

app.listen(5001, () => {
  console.log(`Server running on port 5001`);
}); 