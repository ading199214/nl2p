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
const PORT = process.env.PORT || 5000;

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
        model: 'gpt-4o',
        messages: [
          {
            role: "system",
            content: "You are an expert web designer who helps users create detailed specifications for web pages. Your job is to take a user's brief, often vague request and expand it into a comprehensive, detailed description that can be used to generate high-quality HTML/CSS/JavaScript. Include specific details about layout, color schemes, functionality, content sections, and styling. Be creative but practical. Your enhanced prompt should be 2 paragraphs long and specific."
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
          content: "You are an expert HTML/CSS/JavaScript developer. Modify the existing code based on the user's instructions. **Guidelines for producing high quality HTML:**\n\n1. **HTML Structure:** Use a complete HTML5 template with `<!DOCTYPE html>`, `<html>`, `<head>` (with meta tags for responsive design), and `<body>`.\n\n2. **Layout and Components:** Include a header with a navigation bar, a main section featuring a hero banner with engaging visuals, content sections, and a footer. Use semantic tags such as `<header>`, `<nav>`, `<main>`, `<section>`, and `<footer>`.\n\n3. **Images:** Use Lorem Picsum for placeholder images. Simply use URLs like `https://picsum.photos/width/height` (e.g., `https://picsum.photos/800/400` for a hero image). Add descriptive alt text for accessibility.\n\n4. **CSS Styling:** Apply a modern, clean design using advanced CSS. Utilize Flexbox or Grid for layout, incorporate a cohesive color scheme, and ensure responsiveness across devices.\n\n5. **Animations:** Integrate smooth CSS animations and transitions (e.g., fade-ins, slide-ins, hover effects) to create a dynamic and engaging user experience.\n\n6. **JavaScript:** Include placeholder functions for interactive elements such as a responsive menu toggle and content slider. Use modern ES6 syntax and organize code for maintainability.\n\n7. **Production Quality:** Ensure the code is well-structured, properly indented, and commented where necessary. The final output should be a complete, production-ready web page.\n\n**IMPORTANT:** Only respond with the raw code without any explanation or markdown formatting."
        }
      ];
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
          content: "You are an expert HTML/CSS/JavaScript developer. Modify the existing code based on the user's instructions. **Guidelines for producing high quality HTML:**\n\n1. **HTML Structure:** Use a complete HTML5 template with `<!DOCTYPE html>`, `<html>`, `<head>` (with meta tags for responsive design), and `<body>`.\n\n2. **Layout and Components:** Include a header with a navigation bar, a main section featuring a hero banner with engaging visuals, content sections, and a footer. Use semantic tags such as `<header>`, `<nav>`, `<main>`, `<section>`, and `<footer>`.\n\n3. **Images:** Use Lorem Picsum for placeholder images. Simply use URLs like `https://picsum.photos/width/height` (e.g., `https://picsum.photos/800/400` for a hero image). Add descriptive alt text for accessibility.\n\n4. **CSS Styling:** Apply a modern, clean design using advanced CSS. Utilize Flexbox or Grid for layout, incorporate a cohesive color scheme, and ensure responsiveness across devices.\n\n5. **Animations:** Integrate smooth CSS animations and transitions (e.g., fade-ins, slide-ins, hover effects) to create a dynamic and engaging user experience.\n\n6. **JavaScript:** Include placeholder functions for interactive elements such as a responsive menu toggle and content slider. Use modern ES6 syntax and organize code for maintainability.\n\n7. **Production Quality:** Ensure the code is well-structured, properly indented, and commented where necessary. The final output should be a complete, production-ready web page.\n\n**IMPORTANT:** Only respond with the raw code without any explanation or markdown formatting."
        }
      ];
    }
    
    // If this is an enhanced prompt, add both the original and enhanced prompts to the chat history
    if (isEnhancedPrompt && chatHistories[sessionId].originalPrompt) {
      chatHistories[sessionId].push({
        role: "user",
        content: `Original request: ${chatHistories[sessionId].originalPrompt}\n\nDetailed specification: ${prompt}`
      });
    } else {
      // Add the user's prompt to the chat history
      chatHistories[sessionId].push({
        role: "user",
        content: prompt
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
        model: 'o3-mini',
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
    generatedCode = generatedCode.replace(/\s*```$/i, '');
    
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
          content: "You are an expert HTML/CSS/JavaScript developer specializing in precise, targeted modifications to web pages. Your task is to modify ONLY the specific parts of the code that need to be changed based on the user's request, while preserving everything else exactly as is.\n\n**IMPORTANT GUIDELINES:**\n\n1. **Make Minimal Changes:** Only modify what is explicitly requested. Do not rewrite or restructure unrelated parts of the code.\n\n2. **Preserve Structure:** Maintain the existing HTML structure, class names, IDs, and overall organization unless specifically asked to change them.\n\n3. **Maintain Styling:** Keep all existing CSS styles intact unless the modification request explicitly involves changing styles.\n\n4. **Respect JavaScript:** Do not modify JavaScript functionality unless specifically requested.\n\n5. **Be Efficient:** Process the request quickly and focus only on the requested changes.\n\n6. **Return Complete Code:** Always return the complete HTML document with your targeted changes applied.\n\n**IMPORTANT:** Only respond with the raw code without any explanation or markdown formatting. Do not include any commentary about what you changed."
        }
      ];
    }
    
    // Add the current code and modification request to the chat history
    chatHistories[sessionId].push({
      role: "user",
      content: prompt
    });
    
    // Call OpenAI API with both the code and prompt
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'o3-mini',
        reasoning_effort: "low",
        messages: [
          // System message
          chatHistories[sessionId][0],
          // Add the current code as a separate message
          {
            role: "assistant",
            content: currentCode
          },
          // Add the modification request with clear instructions
          {
            role: "user",
            content: `I need you to make a SPECIFIC change to the above HTML code. Please modify ONLY what I'm asking for and keep everything else exactly the same.\n\nRequested change: ${prompt}\n\nRemember: Only change what's needed for this specific request. Don't rewrite or restructure other parts of the code.`
          }
        ],
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
    modifiedCode = modifiedCode.replace(/\s*```$/i, '');
    
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 