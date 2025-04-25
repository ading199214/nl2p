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
            content: "You are an expert web designer who helps users create detailed specifications for web pages. Your job is to take a user's general request and expand it into a comprehensive, detailed description that can be used to generate high-quality HTML/CSS/JavaScript. if the webpage the user intend to build needs information, provide that information. For examples, if the user wants to build a webpage for a company, provide information about the company such as the name, industry, location, specialities, products  and a description of the company. If the webpage the user intended to build is a personal website, let's make the design more free and fun. if user intend to build some web component technical to verify some idea. keep the styling minimum. Please also include specific details about layout, color schemes, functionality, content sections, and styling according to the webpage the user intends to build. Be creative but practical. Your enhanced prompt should be 2 paragraphs long and specific."          },
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
          content: "You are an expert HTML/CSS/JavaScript developer. Generate code based on the user's instructions. Please keep all the info the user provided, and put them on the webpage content.  **Guidelines for producing high quality HTML:**\n\n1. **HTML Structure:** Use a complete HTML5 template with `<!DOCTYPE html>`, `<html>`, `<head>` (with meta tags for responsive design), and `<body>`.\n\n2. **Layout and Components:** Include a header with a navigation bar, a main section featuring a hero banner with engaging visuals, content sections, and a footer. Use semantic tags such as `<header>`, `<nav>`, `<main>`, `<section>`, and `<footer>`.\n\n3. **Design Theme:** **MANDATORY REQUIREMENT:** The header background MUST be #00823C and MUST include \"MANN+HUMMEL\" text in white color (#FFFFFF) positioned on the left side of the header as a logo element. For other elements, use ONLY the following colors: #46AF28 (green), #FF7300 (orange), #C80F2D (red), and related shades. Do not use any other colors.\n\n4. **Typography:** **MANDATORY REQUIREMENT:** Set the font-family for the entire page to \"Gotham\", sans-serif.\n\n5. **Images:** if needed,  Use Lorem Picsum for placeholder images. Simply use URLs like `https://picsum.photos/width/height` (e.g., `https://picsum.photos/800/400` for a hero image). Add descriptive alt text for accessibility.\n\n6. **CSS Styling:** Apply a modern, clean design using advanced CSS. Utilize Flexbox or Grid for layout, incorporate a cohesive color scheme based on the approved colors, and ensure responsiveness across devices.\n\n7. **Animations:** Integrate smooth CSS animations and transitions (e.g., fade-ins, slide-ins, hover effects) to create a dynamic and engaging user experience.\n\n8. **JavaScript:** Implement all the functions for interactive elements such as a responsive menu toggle, buttons and content slider. Use modern ES6 syntax and organize code for maintainability.\n\n9. **Production Quality:** Ensure the code is well-structured, properly indented, and commented where necessary. The final output should be a complete, production-ready web page.\n\n**IMPORTANT:** Only respond with the raw code without any explanation or markdown formatting."        }      ];
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
          content: "You are an expert HTML/CSS/JavaScript developer. Generate code based on the user's instructions. Please keep all the info the user provided, and put them on the webpage content.  **Guidelines for producing high quality HTML:**\n\n1. **HTML Structure:** Use a complete HTML5 template with `<!DOCTYPE html>`, `<html>`, `<head>` (with meta tags for responsive design), and `<body>`.\n\n2. **Layout and Components:** Include a header with a navigation bar, a main section featuring a hero banner with engaging visuals, content sections, and a footer. Use semantic tags such as `<header>`, `<nav>`, `<main>`, `<section>`, and `<footer>`.\n\n3. **Design Theme:** **MANDATORY REQUIREMENT:** The header background MUST be #00823C and MUST include \"MANN+HUMMEL\" text in white color (#FFFFFF) positioned on the left side of the header as a logo element. For other elements, use ONLY the following colors: #46AF28 (green), #FF7300 (orange), #C80F2D (red), and related shades. Do not use any other colors.\n\n4. **Typography:** **MANDATORY REQUIREMENT:** Set the font-family for the entire page to \"Gotham\", sans-serif.\n\n5. **Images:** if needed,  Use Lorem Picsum for placeholder images. Simply use URLs like `https://picsum.photos/width/height` (e.g., `https://picsum.photos/800/400` for a hero image). Add descriptive alt text for accessibility.\n\n6. **CSS Styling:** Apply a modern, clean design using advanced CSS. Utilize Flexbox or Grid for layout, incorporate a cohesive color scheme based on the approved colors, and ensure responsiveness across devices.\n\n7. **Animations:** Integrate smooth CSS animations and transitions (e.g., fade-ins, slide-ins, hover effects) to create a dynamic and engaging user experience.\n\n8. **JavaScript:** Implement all the functions for interactive elements such as a responsive menu toggle, buttons and content slider. Use modern ES6 syntax and organize code for maintainability.\n\n9. **Production Quality:** Ensure the code is well-structured, properly indented, and commented where necessary. The final output should be a complete, production-ready web page.\n\n**IMPORTANT:** Your entire response must be ONLY the raw HTML code without any explanation, markdown formatting, or comments to the user. Your response MUST be a complete HTML document starting with <!DOCTYPE html> and ending with </html>. Do not include ANY text before or after the HTML document."
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
          content: "You are an expert HTML/CSS/JavaScript developer specializing in precise, targeted modifications to web pages. Your task is to modify ONLY the specific parts of the code that need to be changed based on the user's request, while preserving everything else exactly as is.\n\n**IMPORTANT GUIDELINES:**\n\n1. **Make Minimal Changes:** Only modify or add what is explicitly requested. Do not rewrite or restructure unrelated parts of the code.\n\n2. **Preserve Structure:** Maintain the existing HTML structure, class names, IDs, and overall organization unless specifically asked to change them.\n\n3. **Maintain Styling:** Keep all existing CSS styles intact unless the modification request explicitly involves changing styles.\n\n4. **Design Theme:** **MANDATORY REQUIREMENT:** The header background MUST be #00823C and MUST include \"MANN+HUMMEL\" text in white color (#FFFFFF) positioned on the left side of the header as a logo element. For other elements, use ONLY the following colors: #46AF28 (green), #FF7300 (orange), #C80F2D (red), and related shades. Do not use any other colors.\n\n5. **Typography:** **MANDATORY REQUIREMENT:** Set the font-family for the entire page to \"Gotham\", sans-serif.\n\n6. **Respect JavaScript:** Do not modify JavaScript functionality unless specifically requested.\n\n7. **Be Efficient:** Process the request quickly and focus only on the requested changes.\n\n8. **Return Complete Code:** Always and only return the complete HTML document with your targeted changes applied.\n\n**IMPORTANT:** Your entire response must be ONLY the raw HTML code without any explanation, markdown formatting, or comments to the user. Do not include ANY text before or after the HTML document."
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