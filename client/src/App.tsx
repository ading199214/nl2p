import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import './App.css';

// Types
interface ChatMessage {
  role: string;
  content: string;
}

interface DisplayMessage extends ChatMessage {
  displayContent: string;
  isCode: boolean;
  state?: string;
}

// Language translations
interface Translations {
  title: string;
  subtitle?: string;
  newSession: string;
  importHtml: string;
  deploy: string;
  deploying: string;
  viewSite: string;
  preview: string;
  fullscreen: string;
  emptyPreview: string;
  chatHistory: string;
  createWebPage: string;
  modifyWebPage: string;
  createPlaceholder: string;
  modifyPlaceholder: string;
  generatePage: string;
  modifyPage: string;
  processing: string;
  showCode: string;
  hideCode: string;
  generatedCode: string;
  close: string;
  userLabel: string;
  aiLabel: string;
  viewGeneratedCode: string;
  generatedNewVersion: string;
  deploymentDemo: string;
  exportHtml: string;
  downloadSuccess: string;
  // New translations for the two-step process
  reviewPrompt: string;
  originalPrompt: string;
  enhancedPrompt: string;
  generateWithEnhanced: string;
  useOriginalInstead: string;
  enhancingPrompt: string;
}

const translations: Record<string, Translations> = {
  en: {
    title: "Natural Language to Web Page",
    subtitle: "",
    newSession: "New Session",
    importHtml: "Import HTML",
    deploy: "Deploy to Netlify",
    deploying: "Deploying...",
    viewSite: "View Site",
    preview: "Preview",
    fullscreen: "Fullscreen",
    emptyPreview: "Your generated web page will appear here.",
    chatHistory: "Chat History",
    createWebPage: "Create Your Web Page",
    modifyWebPage: "Modify Your Web Page",
    createPlaceholder: "Describe the web page you want to create...",
    modifyPlaceholder: "Describe SPECIFIC changes you want to make (e.g., 'Change the header background to blue', 'Add a contact form below the about section')...",
    generatePage: "Generate Page",
    modifyPage: "Apply Changes",
    processing: "Processing...",
    showCode: "Show Code",
    hideCode: "Hide Code",
    generatedCode: "Generated HTML/CSS/JS Code",
    close: "Close",
    userLabel: "You",
    aiLabel: "AI",
    viewGeneratedCode: "View Generated Code",
    generatedNewVersion: "Generated a new version of the web page",
    deploymentDemo: "This is a UI demo - no actual deployment occurred. In a production version, the site would be deployed to:",
    exportHtml: "Export HTML",
    downloadSuccess: "The HTML file has been downloaded to your computer. You can open and view the file by double-clicking to open it in any browser.",
    // New translations for the two-step process
    reviewPrompt: "Review Enhanced Prompt",
    originalPrompt: "Original Prompt:",
    enhancedPrompt: "We've enhanced your prompt with more details. Feel free to edit it before generating the page:",
    generateWithEnhanced: "Generate with This Prompt",
    useOriginalInstead: "Use Original Prompt",
    enhancingPrompt: "Enhancing Prompt..."
  },
  zh: {
    title: "码农老弟",
    subtitle: "开发你交给我就行",
    newSession: "新建会话",
    importHtml: "导入HTML",
    deploy: "部署到网络",
    deploying: "部署中...",
    viewSite: "查看网站",
    preview: "预览",
    fullscreen: "全屏",
    emptyPreview: "您生成的网页将显示在这里。",
    chatHistory: "对话历史",
    createWebPage: "创建网页",
    modifyWebPage: "修改网页",
    createPlaceholder: "请描述您想要创建的网页，越具体越好，（如：一个带导航栏、滤清器产品展示和联系表单的企业网站，需要有子页面，如产品展示页、联系页）...",
    modifyPlaceholder: "请描述您想要进行的具体修改（例如：'将页眉背景改为蓝色'，'在关于部分下方添加联系表单'）...",
    generatePage: "开始生成",
    modifyPage: "应用修改",
    processing: "处理中...",
    showCode: "查看代码",
    hideCode: "隐藏代码",
    generatedCode: "生成的网页代码",
    close: "关闭",
    userLabel: "用户",
    aiLabel: "AI助手",
    viewGeneratedCode: "查看生成的代码",
    generatedNewVersion: "已生成网页的新版本",
    deploymentDemo: "这是演示模式 - 实际部署功能暂未启用。在完整版本中，网站将被部署到：",
    exportHtml: "导出HTML",
    downloadSuccess: "HTML文件已下载到您的计算机。您可以通过双击在任何浏览器中打开查看文件。",
    // New translations for the two-step process
    reviewPrompt: "审核增强提示",
    originalPrompt: "原始提示:",
    enhancedPrompt: "我们已经增强了您的提示，添加了更多细节。您可以在生成页面之前编辑它：",
    generateWithEnhanced: "使用此提示生成",
    useOriginalInstead: "使用原始提示",
    enhancingPrompt: "正在增强提示..."
  }
};

function App() {
  // State
  const [sessionId, setSessionId] = useState<string>('');
  const [prompt, setPrompt] = useState<string>('');
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showCode, setShowCode] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [deploymentUrl, setDeploymentUrl] = useState<string | null>(null);
  const [siteName, setSiteName] = useState<string>('');
  // Keep only the necessary state variables
  const [refreshKey, setRefreshKey] = useState<number>(0);
  // Set default language to Chinese
  const [language, setLanguage] = useState<'en' | 'zh'>('zh');
  // Add new state for modal
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  
  // New state variables for the two-step process
  const [enhancedPrompt, setEnhancedPrompt] = useState<string>('');
  const [isEnhancingPrompt, setIsEnhancingPrompt] = useState<boolean>(false);
  const [showPromptReview, setShowPromptReview] = useState<boolean>(false);
  const [originalPrompt, setOriginalPrompt] = useState<string>('');
  
  // Refs
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Get current translations
  const t = translations[language];

  // Toggle language
  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'zh' : 'en');
  };

  // Initialize session ID
  useEffect(() => {
    // Check if a session ID exists in localStorage
    const storedSessionId = localStorage.getItem('nl2page_session_id');
    if (storedSessionId) {
      setSessionId(storedSessionId);
      // Load chat history for this session
      fetchChatHistory(storedSessionId);
    } else {
      // Create a new session ID
      const newSessionId = uuidv4();
      setSessionId(newSessionId);
      localStorage.setItem('nl2page_session_id', newSessionId);
    }
  }, []);

  // Fetch chat history for a session
  const fetchChatHistory = async (sid: string) => {
    try {
      const response = await axios.get(`/api/history/${sid}`);
      if (response.data.chatHistory) {
        setChatHistory(response.data.chatHistory);
        
        // If there's a generated code in the history, set it
        const assistantMessages = response.data.chatHistory.filter(
          (msg: ChatMessage) => msg.role === 'assistant'
        );
        if (assistantMessages.length > 0) {
          setGeneratedCode(assistantMessages[assistantMessages.length - 1].content);
        }
      }
    } catch (err) {
      console.error('Error fetching chat history:', err);
      // It's okay if there's no history yet
    }
  };

  // Generate code from natural language
  const generateCode = async () => {
    if (!prompt.trim()) {
      setError('Please enter a description of the web page you want to create.');
      return;
    }

    // If we have an enhanced prompt and we're in review mode, use it directly
    if (showPromptReview && enhancedPrompt) {
      setIsLoading(true);
      setError(null);
      setShowPromptReview(false);

      try {
        const response = await axios.post('/api/generate', {
          prompt: enhancedPrompt,
          sessionId,
          isEnhancedPrompt: true
        });

        setGeneratedCode(response.data.code);
        setChatHistory(response.data.chatHistory);
        setPrompt(''); // Clear the prompt
        setEnhancedPrompt(''); // Clear the enhanced prompt
        setOriginalPrompt(''); // Clear the original prompt
      } catch (err: any) {
        console.error('Error generating code:', err);
        setError(err.response?.data?.error || 'An error occurred while generating the code.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // First step: Enhance the prompt
    setIsEnhancingPrompt(true);
    setError(null);
    setOriginalPrompt(prompt);

    try {
      const response = await axios.post('/api/enhance-prompt', {
        prompt,
        sessionId
      });

      setEnhancedPrompt(response.data.enhancedPrompt);
      setShowPromptReview(true);
    } catch (err: any) {
      console.error('Error enhancing prompt:', err);
      setError(err.response?.data?.error || 'An error occurred while enhancing the prompt.');
      // If enhancement fails, fall back to the original prompt
      fallbackToOriginalPrompt();
    } finally {
      setIsEnhancingPrompt(false);
    }
  };

  // Fall back to using the original prompt if enhancement fails
  const fallbackToOriginalPrompt = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/generate', {
        prompt: originalPrompt,
        sessionId,
        isEnhancedPrompt: false
      });

      setGeneratedCode(response.data.code);
      setChatHistory(response.data.chatHistory);
      setPrompt(''); // Clear the prompt
    } catch (err: any) {
      console.error('Error generating code:', err);
      setError(err.response?.data?.error || 'An error occurred while generating the code.');
    } finally {
      setIsLoading(false);
    }
  };

  // Cancel the enhanced prompt and use the original prompt
  const cancelEnhancedPrompt = () => {
    setShowPromptReview(false);
    fallbackToOriginalPrompt();
  };

  // Edit the enhanced prompt
  const updateEnhancedPrompt = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEnhancedPrompt(e.target.value);
  };

  // Modify existing code
  const modifyCode = async () => {
    if (!prompt.trim()) {
      setError('Please enter your modification request.');
      return;
    }

    setIsLoading(true);
    setError(null);

    // Show a message to the user that we're making targeted changes
    const currentChatHistory = [...chatHistory];
    currentChatHistory.push({
      role: "user",
      content: prompt
    });
    currentChatHistory.push({
      role: "system",
      content: "Making targeted changes to your web page..."
    });
    setChatHistory(currentChatHistory);

    try {
      const response = await axios.post('/api/modify', {
        prompt,
        currentCode: generatedCode,
        sessionId
      });

      setGeneratedCode(response.data.code);
      setChatHistory(response.data.chatHistory);
      setPrompt(''); // Clear the prompt
      
      // Trigger a refresh of the iframe to show the changes
      setRefreshKey(prevKey => prevKey + 1);
      
      // After the iframe loads, highlight the changes
      setTimeout(() => {
        highlightChanges();
      }, 1000);
    } catch (err: any) {
      console.error('Error modifying code:', err);
      setError(err.response?.data?.error || 'An error occurred while modifying the code.');
      
      // Remove the temporary system message if there was an error
      setChatHistory(currentChatHistory.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  // Highlight changes in the preview
  const highlightChanges = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      const iframe = iframeRef.current;
      const iframeWindow = iframe.contentWindow;
      
      if (!iframeWindow) return;
      
      const iframeDoc = iframeWindow.document;
      
      // Inject a style element to define the highlight animation
      const styleEl = iframeDoc.createElement('style');
      styleEl.textContent = `
        @keyframes highlightChange {
          0% { outline: 2px solid transparent; }
          25% { outline: 2px solid #2563eb; }
          75% { outline: 2px solid #2563eb; }
          100% { outline: 2px solid transparent; }
        }
        .highlight-change {
          animation: highlightChange 2s ease-in-out;
        }
      `;
      iframeDoc.head.appendChild(styleEl);
      
      // Try to identify elements that might have changed based on the prompt
      // This is a simple heuristic and won't catch all changes
      const keywords = prompt.toLowerCase().split(/\s+/);
      const elements = Array.from(iframeDoc.querySelectorAll('*'));
      
      elements.forEach(el => {
        const text = el.textContent?.toLowerCase() || '';
        const id = el.id?.toLowerCase() || '';
        const className = el.className?.toLowerCase() || '';
        const tagName = el.tagName?.toLowerCase() || '';
        
        // Check if this element matches any keywords from the prompt
        const matchesKeyword = keywords.some(keyword => 
          keyword.length > 3 && (
            text.includes(keyword) || 
            id.includes(keyword) || 
            className.includes(keyword) ||
            tagName === keyword
          )
        );
        
        if (matchesKeyword) {
          el.classList.add('highlight-change');
        }
      });
    }
  };

  // Toggle code view
  const toggleCodeView = () => {
    setShowCode(!showCode);
  };

  // Create a new session
  const createNewSession = () => {
    const newSessionId = uuidv4();
    setSessionId(newSessionId);
    localStorage.setItem('nl2page_session_id', newSessionId);
    setChatHistory([]);
    setGeneratedCode('');
    setPrompt('');
    setError(null);
  };

  // Placeholder for Netlify deployment (removed actual implementation)
  const deployToNetlify = async () => {
    if (!generatedCode) {
      setError('No code to deploy. Generate a page first.');
      return;
    }

    setIsDeploying(true);
    setError(null);

    try {
      // Simulate deployment delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Create a mock deployment URL
      const mockSiteName = siteName || `nl2page-demo-${Math.floor(Math.random() * 10000)}`;
      const mockUrl = `https://${mockSiteName}.netlify.app`;
      
      setDeploymentUrl(mockUrl);
      
      // Add a message to the chat history about the deployment
      const deploymentMessage = {
        role: "system",
        content: `${t.deploymentDemo} ${mockUrl}`
      };
      
      setChatHistory([...chatHistory, deploymentMessage]);
      
    } catch (err: any) {
      console.error('Error in deployment demo:', err);
      setError('This is a UI demo. No actual deployment has been implemented.');
    } finally {
      setIsDeploying(false);
    }
  };

  // Render the chat history
  const renderChatHistory = () => {
    // Filter out system messages and format the content for display only
    const displayMessages: DisplayMessage[] = chatHistory.filter(msg => msg.role !== 'system').map(msg => {
      // If it's an assistant message with HTML code
      if (msg.role === 'assistant') {
        if (msg.content.trim().startsWith('<!DOCTYPE html')) {
          return {
            ...msg,
            displayContent: "ready",
            state: "ready",
            isCode: true
          };
        } else if (msg.content.includes("error") || msg.content.toLowerCase().includes("sorry")) {
          return {
            ...msg,
            displayContent: "error: " + msg.content,
            state: "error",
            isCode: false
          };
        } else {
          return {
            ...msg,
            displayContent: msg.content,
            state: "generating",
            isCode: false
          };
        }
      }
      return {
        ...msg,
        displayContent: msg.content,
        isCode: false
      };
    });
    
    return displayMessages.map((msg, index) => (
      <div key={index} className={`chat-message ${msg.role} ${msg.state || ""}`}>
        <div className="message-header">{msg.role === 'user' ? t.userLabel : t.aiLabel}</div>
        {msg.role === 'user' ? (
          <div className="message-content">{msg.displayContent}</div>
        ) : (
          <div className="message-content">
            {msg.state ? (
              <div className="message-state">{msg.displayContent}</div>
            ) : (
              msg.displayContent
            )}
          </div>
        )}
      </div>
    ));
  };

  // Update the handleIframeMessage function to only handle necessary events
  const handleIframeMessage = (event: MessageEvent) => {
    // Only accept messages from our iframe
    if (iframeRef.current?.contentWindow !== event.source) return;

    // Handle any iframe messages that might be useful
    // Currently nothing to handle since we removed the console functionality
  };

  // Set up event listener for iframe messages
  useEffect(() => {
    window.addEventListener('message', handleIframeMessage);
    return () => {
      window.removeEventListener('message', handleIframeMessage);
    };
  }, []);

  // New function to prevent navigation in the iframe
  const handleIframeLoad = () => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentWindow) return;

    try {
      // Add event listeners to prevent navigation in the iframe content window
      iframe.contentWindow.addEventListener('click', (e) => {
        // For links with href attributes
        const target = e.target as HTMLElement;
        const closestLink = target.closest('a');
        if (closestLink && closestLink.href && !closestLink.target) {
          e.preventDefault();
          // Optionally log the prevented navigation
          console.log('Prevented navigation to:', closestLink.href);
        }
      }, true);

      // Handle form submissions
      iframe.contentWindow.addEventListener('submit', (e) => {
        e.preventDefault();
        console.log('Prevented form submission');
      }, true);
    } catch (err) {
      // Handle potential security errors due to cross-origin restrictions
      console.error('Error setting up iframe event listeners:', err);
    }
  };

  // Enhanced function to inject scripts into the iframe content
  const injectIframeScripts = (htmlCode: string): string => {
    const consoleCapture = `
    <script>
      // Override console methods to capture logs
      const originalConsole = {
        log: console.log,
        error: console.error,
        warn: console.warn,
        info: console.info
      };
      
      // Redirect console methods to parent window
      console.log = (...args) => {
        originalConsole.log(...args);
        window.parent.postMessage({
          type: 'console',
          data: { level: 'log', content: args.map(arg => JSON.stringify(arg)).join(' ') }
        }, '*');
      };
      
      console.error = (...args) => {
        originalConsole.error(...args);
        window.parent.postMessage({
          type: 'console',
          data: { level: 'error', content: args.map(arg => JSON.stringify(arg)).join(' ') }
        }, '*');
      };
      
      console.warn = (...args) => {
        originalConsole.warn(...args);
        window.parent.postMessage({
          type: 'console',
          data: { level: 'warn', content: args.map(arg => JSON.stringify(arg)).join(' ') }
        }, '*');
      };
      
      console.info = (...args) => {
        originalConsole.info(...args);
        window.parent.postMessage({
          type: 'console',
          data: { level: 'info', content: args.map(arg => JSON.stringify(arg)).join(' ') }
        }, '*');
      };
      
      // Capture uncaught errors
      window.addEventListener('error', (event) => {
        window.parent.postMessage({
          type: 'console',
          data: { level: 'error', content: 'Uncaught error: ' + event.message + ' at ' + event.filename + ':' + event.lineno }
        }, '*');
      });

      // Prevent navigation behavior
      document.addEventListener('click', function(e) {
        const target = e.target;
        // Handle links
        if (target.tagName === 'A' && target.href && !target.hasAttribute('target')) {
          e.preventDefault();
          console.log('Navigation prevented for:', target.href);
        }
      }, true);

      // Prevent forms from navigating
      document.addEventListener('submit', function(e) {
        e.preventDefault();
        console.log('Form submission prevented');
      }, true);

      // Manually handle form submissions to keep them inside the iframe
      document.querySelectorAll('form').forEach(form => {
        form.onsubmit = (e) => {
          e.preventDefault();
          console.log('Form submission:', new FormData(form));
          // You could handle the form data here if needed
          return false;
        };
      });

      // Override history push state to prevent navigation
      const originalPushState = history.pushState;
      history.pushState = function() {
        console.log('History pushState prevented');
        return originalPushState.apply(this, arguments);
      };

      const originalReplaceState = history.replaceState;
      history.replaceState = function() {
        console.log('History replaceState prevented');
        return originalReplaceState.apply(this, arguments);
      };
    </script>
    `;
    
    // Insert script right after the opening <head> tag or create one if not present
    if (htmlCode.includes('<head>')) {
      return htmlCode.replace('<head>', '<head>' + consoleCapture);
    } else if (htmlCode.includes('<html>')) {
      return htmlCode.replace('<html>', '<html><head>' + consoleCapture + '</head>');
    } else {
      return consoleCapture + htmlCode;
    }
  };

  // Use the new inject function instead of the old one
  const injectConsoleCapture = injectIframeScripts;

  // Function to handle full screen preview
  const openFullscreenPreview = () => {
    if (!generatedCode) return;
    
    // Create full screen preview
    const newWindow = window.open('', '_blank');
    if (!newWindow) {
      console.error('Could not open new window. Check if pop-ups are blocked.');
      return;
    }
    
    // Write the HTML content to the new window
    newWindow.document.open();
    newWindow.document.write(generatedCode);
    newWindow.document.close();
  };

  // Function to export HTML
  const exportHtml = async () => {
    if (!generatedCode) return;

    try {
      const response = await axios.post('/api/export-html', {
        htmlContent: generatedCode
      }, {
        responseType: 'blob'
      });

      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'exported_page.html');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      // Show success modal
      setShowSuccessModal(true);
      
      // Auto hide after 5 seconds
      setTimeout(() => {
        setShowSuccessModal(false);
      }, 5000);
    } catch (err: any) {
      console.error('Error exporting HTML:', err);
      setError(err.response?.data?.error || 'An error occurred while exporting the HTML.');
    }
  };

  // Add new state for imported HTML
  const [importedHtml, setImportedHtml] = useState<string>('');

  // Add new function to handle file import
  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setImportedHtml(content);
        setGeneratedCode(content);
        setRefreshKey(prev => prev + 1);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="app">
      <div className="app-wrapper active">
        <header className="app-header">
          <div className="title-container">
            <h1 className={language === 'zh' ? 'chinese-title' : ''}>{t.title}</h1>
            {t.subtitle && (
              <div className={language === 'zh' ? 'chinese-subtitle' : 'english-subtitle'}>
                {t.subtitle}
              </div>
            )}
          </div>
          <div className="header-actions">
            <input
              type="file"
              id="html-import"
              accept=".html"
              style={{ display: 'none' }}
              onChange={handleFileImport}
            />
            <button 
              className="action-btn import-btn"
              onClick={() => document.getElementById('html-import')?.click()}
            >
              {t.importHtml}
            </button>
            {generatedCode && (
              <>
                <button
                  className="action-btn deploy-btn"
                  onClick={deployToNetlify}
                  disabled={true}
                >
                  {isDeploying ? t.deploying : t.deploy}
                </button>
                <button
                  className="action-btn export-btn"
                  onClick={exportHtml}
                  title={t.exportHtml}
                >
                  {t.exportHtml}
                </button>
              </>
            )}
            <button className="action-btn new-session-btn" onClick={createNewSession}>
              {t.newSession}
            </button>
            <button className="action-btn language-toggle-btn" onClick={toggleLanguage}>
              {language === 'en' ? '中文' : 'English'}
            </button>
          </div>
        </header>

        <div className="app-container">
          <div className="preview-container">
            <div className="preview-header">
              <h2>{t.preview}</h2>
              <div className="preview-actions">
                {generatedCode && (
                  <button
                    className="fullscreen-btn"
                    onClick={openFullscreenPreview}
                    title={t.fullscreen}
                  >
                    {t.fullscreen}
                  </button>
                )}
              </div>
            </div>
            
            <div className="preview-wrapper">
              {generatedCode ? (
                <iframe
                  key={refreshKey}
                  ref={iframeRef}
                  title="preview"
                  className="preview-iframe"
                  srcDoc={injectConsoleCapture(generatedCode)}
                  sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
                  onLoad={handleIframeLoad}
                />
              ) : (
                <div className="empty-preview">
                  <p>{t.emptyPreview}</p>
                </div>
              )}
            </div>
            
            {showCode && (
              <div className="code-container">
                <div className="code-header">
                  <h3>{t.generatedCode}</h3>
                  <button className="close-btn" onClick={toggleCodeView}>
                    {t.close}
                  </button>
                </div>
                <pre className="code-display">{generatedCode}</pre>
              </div>
            )}
          </div>

          <div className="input-container">
            <div className="input-header">
              <h2>{t.chatHistory}</h2>
            </div>

            <div className="messages-container">
              {renderChatHistory()}
            </div>

            <div className="input-footer">
              <textarea
                className="prompt-input"
                value={showPromptReview ? `${t.originalPrompt}\n${originalPrompt}\n\n${t.enhancedPrompt}\n${enhancedPrompt}` : prompt}
                onChange={(e) => showPromptReview ? updateEnhancedPrompt(e) : setPrompt(e.target.value)}
                placeholder={
                  generatedCode
                    ? t.modifyPlaceholder
                    : t.createPlaceholder
                }
                disabled={isLoading || isEnhancingPrompt}
              />
              
              {error && <div className="error-message">{error}</div>}
              
              <div className="button-container">
                <button
                  className="action-btn"
                  onClick={generatedCode ? modifyCode : generateCode}
                  disabled={isLoading || isEnhancingPrompt}
                >
                  {isLoading || isEnhancingPrompt ? 
                    (isEnhancingPrompt ? t.enhancingPrompt : t.processing) : 
                    (generatedCode ? t.modifyPage : t.generatePage)}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Add success modal */}
        {showSuccessModal && (
          <div className="modal-overlay">
            <div className="modal-content success-modal">
              <div className="modal-message">
                {t.downloadSuccess}
              </div>
              <button 
                className="modal-close"
                onClick={() => setShowSuccessModal(false)}
              >
                {t.close}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App; 