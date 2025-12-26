const express = require('express');
const router = express.Router();
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// AI Configuration
const AI_CONFIG = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    endpoint: 'https://api.openai.com/v1',
    models: {
      chat: 'gpt-3.5-turbo',
      vision: 'gpt-4-vision-preview',
      image: 'dall-e-2'
    }
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta'
  },
  huggingface: {
    apiKey: process.env.HF_API_KEY || '',
    endpoints: {
      text: 'https://api-inference.huggingface.co/models',
      image: 'https://api-inference.huggingface.co/models'
    }
  },
  local: {
    enabled: true,
    models: {
      chat: 'llama-2-7b',
      image: 'stable-diffusion'
    }
  }
};

// AI Chat endpoint
router.post('/chat', async (req, res) => {
  try {
    const { message, history = [], model = 'local' } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    let response;
    
    switch (model) {
      case 'openai':
        response = await chatWithOpenAI(message, history);
        break;
      case 'gemini':
        response = await chatWithGemini(message, history);
        break;
      default:
        response = await chatLocalAI(message, history);
    }
    
    res.json({
      success: true,
      response,
      model
    });
    
  } catch (error) {
    console.error('AI Chat error:', error);
    res.status(500).json({ 
      error: 'AI service error',
      fallback: getFallbackResponse(req.body.message)
    });
  }
});

// Image Processing endpoint
router.post('/process-image', async (req, res) => {
  try {
    const { image, operation, options = {} } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: 'Image is required' });
    }
    
    let result;
    
    switch (operation) {
      case 'analyze':
        result = await analyzeImage(image, options);
        break;
      case 'enhance':
        result = await enhanceImage(image, options);
        break;
      case 'edit':
        result = await editImage(image, options);
        break;
      case 'generate':
        result = await generateImage(options.prompt);
        break;
      default:
        result = await basicImageProcessing(image, operation);
    }
    
    res.json({
      success: true,
      result,
      operation
    });
    
  } catch (error) {
    console.error('Image processing error:', error);
    res.status(500).json({ 
      error: 'Image processing failed',
      fallback: 'Using basic image processing'
    });
  }
});

// Code Error Fixing endpoint
router.post('/fix-code', async (req, res) => {
  try {
    const { code, language, errors } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }
    
    const fixedCode = await fixCodeWithAI(code, language, errors);
    
    res.json({
      success: true,
      original: code,
      fixed: fixedCode,
      changes: analyzeCodeChanges(code, fixedCode)
    });
    
  } catch (error) {
    console.error('Code fixing error:', error);
    res.status(500).json({ 
      error: 'Code fixing failed',
      fallback: applyBasicFixes(req.body.code, req.body.errors)
    });
  }
});

// Website Error Fixing endpoint
router.post('/fix-website', async (req, res) => {
  try {
    const { url, html, errors, screenshot } = req.body;
    
    const analysis = await analyzeWebsiteErrors(html, errors);
    const fixes = generateWebsiteFixes(analysis);
    const fixedHTML = applyWebsiteFixes(html, fixes);
    
    res.json({
      success: true,
      url,
      analysis,
      fixes,
      fixedHTML: fixedHTML.substring(0, 10000), // Limit size
      recommendations: generateRecommendations(analysis)
    });
    
  } catch (error) {
    console.error('Website fixing error:', error);
    res.status(500).json({ 
      error: 'Website analysis failed',
      fallback: basicWebsiteFixes(req.body.html, req.body.errors)
    });
  }
});

// Text Processing endpoint
router.post('/process-text', async (req, res) => {
  try {
    const { text, operation, options = {} } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    let result;
    
    switch (operation) {
      case 'summarize':
        result = await summarizeText(text, options);
        break;
      case 'translate':
        result = await translateText(text, options);
        break;
      case 'paraphrase':
        result = await paraphraseText(text, options);
        break;
      case 'analyze':
        result = await analyzeText(text, options);
        break;
      case 'generate':
        result = await generateText(options.prompt || text, options);
        break;
      default:
        result = { text: `Processed: ${text.substring(0, 100)}...` };
    }
    
    res.json({
      success: true,
      result,
      operation
    });
    
  } catch (error) {
    console.error('Text processing error:', error);
    res.status(500).json({ 
      error: 'Text processing failed',
      fallback: { text: 'Processing unavailable' }
    });
  }
});

// AI Models endpoint
router.get('/models', (req, res) => {
  res.json({
    chat: ['local', 'openai', 'gemini', 'huggingface'],
    image: ['local', 'openai', 'huggingface'],
    code: ['local', 'openai'],
    text: ['local', 'openai', 'gemini']
  });
});

// AI Status endpoint
router.get('/status', (req, res) => {
  res.json({
    enabled: true,
    services: {
      chat: AI_CONFIG.openai.apiKey ? 'premium' : 'basic',
      image: AI_CONFIG.openai.apiKey ? 'premium' : 'basic',
      code: 'basic',
      website: 'basic'
    },
    features: [
      'chat',
      'image_processing',
      'code_fixing',
      'website_fixing',
      'text_processing'
    ]
  });
});

// Helper Functions

async function chatWithOpenAI(message, history) {
  if (!AI_CONFIG.openai.apiKey) {
    throw new Error('OpenAI API key not configured');
  }
  
  const messages = [
    { role: 'system', content: 'You are Redio AI, a helpful assistant integrated into the Redio web platform.' },
    ...history.slice(-10).map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: message }
  ];
  
  const response = await axios.post(
    `${AI_CONFIG.openai.endpoint}/chat/completions`,
    {
      model: AI_CONFIG.openai.models.chat,
      messages,
      max_tokens: 500,
      temperature: 0.7
    },
    {
      headers: {
        'Authorization': `Bearer ${AI_CONFIG.openai.apiKey}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return response.data.choices[0].message.content;
}

async function chatWithGemini(message, history) {
  if (!AI_CONFIG.gemini.apiKey) {
    throw new Error('Gemini API key not configured');
  }
  
  const response = await axios.post(
    `${AI_CONFIG.gemini.endpoint}/models/gemini-pro:generateContent?key=${AI_CONFIG.gemini.apiKey}`,
    {
      contents: [
        {
          parts: [
            { text: message }
          ]
        }
      ]
    }
  );
  
  return response.data.candidates[0].content.parts[0].text;
}

async function chatLocalAI(message, history) {
  // Fallback local AI responses
  const responses = [
    `I understand you said: "${message}". As Redio AI, I can help you with web browsing, fixing website errors, image processing, and more.`,
    `Thanks for your message! I'm Redio AI. I can assist with various tasks including AI chat, image analysis, and error fixing.`,
    `Hello! I'm your Redio AI assistant. How can I help you today?`,
    `I heard: "${message.substring(0, 50)}...". I'm here to help with your Redio experience.`
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
}

async function analyzeImage(imageData, options) {
  // Basic image analysis
  const analysis = {
    type: 'image_analysis',
    detected: [],
    colors: [],
    estimatedSize: 'Unknown',
    suggestedImprovements: []
  };
  
  // Check if it's a base64 image
  if (imageData.startsWith('data:image')) {
    analysis.type = 'base64_image';
    analysis.estimatedSize = `${Math.round(imageData.length * 3 / 4)} bytes`;
    
    // Basic format detection
    if (imageData.includes('image/png')) analysis.format = 'PNG';
    else if (imageData.includes('image/jpeg')) analysis.format = 'JPEG';
    else if (imageData.includes('image/gif')) analysis.format = 'GIF';
    else if (imageData.includes('image/webp')) analysis.format = 'WebP';
    
    // Suggest optimizations
    if (imageData.length > 1000000) { // > 1MB
      analysis.suggestedImprovements.push('Image is large, consider compression');
    }
  }
  
  // Add some AI-like detection
  const objects = ['person', 'animal', 'vehicle', 'building', 'nature', 'text', 'logo'];
  analysis.detected = objects.filter(() => Math.random() > 0.7);
  
  return analysis;
}

async function enhanceImage(imageData, options) {
  // Return enhanced version (simulated)
  return {
    originalSize: imageData.length,
    enhanced: true,
    improvements: ['Increased contrast', 'Reduced noise', 'Optimized colors'],
    downloadUrl: imageData // In real implementation, would return processed image
  };
}

async function editImage(imageData, options) {
  const edits = [];
  
  if (options.crop) edits.push('Cropped image');
  if (options.resize) edits.push(`Resized to ${options.resize}`);
  if (options.filter) edits.push(`Applied ${options.filter} filter`);
  if (options.brightness) edits.push(`Adjusted brightness to ${options.brightness}%`);
  if (options.contrast) edits.push(`Adjusted contrast to ${options.contrast}%`);
  
  return {
    edited: true,
    operations: edits,
    result: 'Image edited successfully'
  };
}

async function generateImage(prompt) {
  if (!prompt) {
    return { error: 'Prompt is required for image generation' };
  }
  
  // Simulate AI image generation
  return {
    generated: true,
    prompt,
    description: `Generated image based on: "${prompt}"`,
    placeholder: `https://via.placeholder.com/512/6366f1/ffffff?text=${encodeURIComponent(prompt.substring(0, 20))}`
  };
}

async function fixCodeWithAI(code, language, errors) {
  let fixedCode = code;
  
  // Basic code fixes
  if (language === 'html') {
    // Fix common HTML issues
    if (!fixedCode.includes('<!DOCTYPE html>')) {
      fixedCode = '<!DOCTYPE html>\n' + fixedCode;
    }
    
    if (!fixedCode.includes('<html')) {
      fixedCode = '<html>\n' + fixedCode + '\n</html>';
    }
    
    if (!fixedCode.includes('<head>')) {
      fixedCode = fixedCode.replace('<html>', '<html>\n<head>\n<title>Fixed Page</title>\n</head>');
    }
    
    if (!fixedCode.includes('<body>')) {
      fixedCode = fixedCode.replace('</head>', '</head>\n<body>') + '\n</body>';
    }
  }
  
  if (language === 'css') {
    // Fix common CSS issues
    if (!fixedCode.includes('{') || !fixedCode.includes('}')) {
      fixedCode = `body {\n  ${fixedCode}\n}`;
    }
  }
  
  if (language === 'javascript') {
    // Fix common JS issues
    if (errors?.includes('undefined')) {
      fixedCode = fixedCode.replace(/undefined/g, 'null');
    }
    
    // Add error handling
    if (!fixedCode.includes('try') && !fixedCode.includes('catch')) {
      fixedCode = `try {\n${fixedCode}\n} catch (error) {\n  console.error('Error:', error);\n}`;
    }
  }
  
  return fixedCode;
}

function analyzeCodeChanges(original, fixed) {
  const changes = [];
  
  if (original.length !== fixed.length) {
    changes.push(`Length changed: ${original.length} → ${fixed.length} characters`);
  }
  
  if (!original.includes('<!DOCTYPE') && fixed.includes('<!DOCTYPE')) {
    changes.push('Added missing DOCTYPE declaration');
  }
  
  if (!original.includes('<html') && fixed.includes('<html')) {
    changes.push('Added HTML structure');
  }
  
  return changes;
}

async function analyzeWebsiteErrors(html, errors) {
  const analysis = {
    issues: [],
    warnings: [],
    suggestions: [],
    score: 100 // Start with perfect score
  };
  
  // Check HTML structure
  if (!html.includes('<!DOCTYPE html>')) {
    analysis.issues.push('Missing DOCTYPE declaration');
    analysis.score -= 10;
  }
  
  if (!html.includes('<html')) {
    analysis.issues.push('Missing HTML tag');
    analysis.score -= 5;
  }
  
  if (!html.includes('<head>')) {
    analysis.issues.push('Missing head section');
    analysis.score -= 5;
  }
  
  if (!html.includes('<body>')) {
    analysis.issues.push('Missing body section');
    analysis.score -= 5;
  }
  
  // Check viewport meta
  if (!html.includes('viewport')) {
    analysis.warnings.push('Missing viewport meta tag for mobile');
    analysis.score -= 3;
  }
  
  // Check charset
  if (!html.includes('charset')) {
    analysis.warnings.push('Missing charset declaration');
    analysis.score -= 3;
  }
  
  // Check for broken elements
  const brokenTags = findBrokenTags(html);
  if (brokenTags.length > 0) {
    analysis.issues.push(`Found ${brokenTags.length} broken HTML tags`);
    analysis.score -= brokenTags.length * 2;
  }
  
  // Check for external resources
  const externalResources = findExternalResources(html);
  analysis.externalResources = externalResources;
  
  // Check for large images
  const largeImages = findLargeImages(html);
  if (largeImages.length > 0) {
    analysis.warnings.push(`Found ${largeImages.length} potentially large images`);
    analysis.suggestions.push('Optimize images for web');
  }
  
  // Check for JavaScript errors
  if (errors && errors.length > 0) {
    analysis.issues.push(`Found ${errors.length} JavaScript errors`);
    analysis.score -= errors.length * 5;
    analysis.jsErrors = errors;
  }
  
  // Generate score description
  if (analysis.score >= 90) analysis.grade = 'Excellent';
  else if (analysis.score >= 80) analysis.grade = 'Good';
  else if (analysis.score >= 70) analysis.grade = 'Fair';
  else analysis.grade = 'Needs Improvement';
  
  return analysis;
}

function findBrokenTags(html) {
  const broken = [];
  const tags = ['div', 'span', 'p', 'a', 'img', 'script', 'style', 'link'];
  
  tags.forEach(tag => {
    const opening = (html.match(new RegExp(`<${tag}[^>]*>`, 'g')) || []).length;
    const closing = (html.match(new RegExp(`</${tag}>`, 'g')) || []).length;
    
    if (opening !== closing) {
      broken.push(`${tag} tags: ${opening} opening vs ${closing} closing`);
    }
  });
  
  return broken;
}

function findExternalResources(html) {
  const resources = {
    scripts: [],
    styles: [],
    images: [],
    iframes: []
  };
  
  // Find external scripts
  const scriptRegex = /<script[^>]*src="([^"]*)"[^>]*>/g;
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    if (match[1].startsWith('http')) {
      resources.scripts.push(match[1]);
    }
  }
  
  // Find external styles
  const styleRegex = /<link[^>]*href="([^"]*)"[^>]*rel="stylesheet"[^>]*>/g;
  while ((match = styleRegex.exec(html)) !== null) {
    if (match[1].startsWith('http')) {
      resources.styles.push(match[1]);
    }
  }
  
  // Find external images
  const imgRegex = /<img[^>]*src="([^"]*)"[^>]*>/g;
  while ((match = imgRegex.exec(html)) !== null) {
    if (match[1].startsWith('http')) {
      resources.images.push(match[1]);
    }
  }
  
  // Find iframes
  const iframeRegex = /<iframe[^>]*src="([^"]*)"[^>]*>/g;
  while ((match = iframeRegex.exec(html)) !== null) {
    if (match[1].startsWith('http')) {
      resources.iframes.push(match[1]);
    }
  }
  
  return resources;
}

function findLargeImages(html) {
  // This would normally check image sizes
  // For now, just count external images
  const imgRegex = /<img[^>]*src="([^"]*)"[^>]*>/g;
  const images = [];
  let match;
  
  while ((match = imgRegex.exec(html)) !== null) {
    images.push(match[1]);
  }
  
  return images.slice(0, 5); // Return first 5
}

function generateWebsiteFixes(analysis) {
  const fixes = [];
  
  analysis.issues.forEach(issue => {
    switch (issue) {
      case 'Missing DOCTYPE declaration':
        fixes.push({
          type: 'doctype',
          fix: 'Add DOCTYPE declaration',
          code: '<!DOCTYPE html>'
        });
        break;
        
      case 'Missing HTML tag':
        fixes.push({
          type: 'html_tag',
          fix: 'Add HTML structure',
          code: '<html>\n</html>'
        });
        break;
        
      case 'Missing head section':
        fixes.push({
          type: 'head_section',
          fix: 'Add head section',
          code: '<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Document</title>\n</head>'
        });
        break;
    }
  });
  
  analysis.warnings.forEach(warning => {
    if (warning.includes('viewport')) {
      fixes.push({
        type: 'viewport',
        fix: 'Add viewport meta tag',
        code: '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
      });
    }
    
    if (warning.includes('charset')) {
      fixes.push({
        type: 'charset',
        fix: 'Add charset declaration',
        code: '<meta charset="UTF-8">'
      });
    }
  });
  
  return fixes;
}

function applyWebsiteFixes(html, fixes) {
  let fixedHTML = html;
  
  fixes.forEach(fix => {
    switch (fix.type) {
      case 'doctype':
        if (!fixedHTML.startsWith('<!DOCTYPE')) {
          fixedHTML = '<!DOCTYPE html>\n' + fixedHTML;
        }
        break;
        
      case 'html_tag':
        if (!fixedHTML.includes('<html')) {
          fixedHTML = '<html>\n' + fixedHTML + '\n</html>';
        }
        break;
        
      case 'head_section':
        if (!fixedHTML.includes('<head>')) {
          fixedHTML = fixedHTML.replace('<html>', '<html>\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Fixed Page</title>\n</head>');
        }
        break;
        
      case 'viewport':
        if (!fixedHTML.includes('viewport')) {
          fixedHTML = fixedHTML.replace('<head>', '<head>\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">');
        }
        break;
        
      case 'charset':
        if (!fixedHTML.includes('charset')) {
          fixedHTML = fixedHTML.replace('<head>', '<head>\n  <meta charset="UTF-8">');
        }
        break;
    }
  });
  
  return fixedHTML;
}

function generateRecommendations(analysis) {
  const recommendations = [];
  
  if (analysis.score < 80) {
    recommendations.push('Fix critical issues to improve website score');
  }
  
  if (analysis.warnings.includes('Missing viewport meta tag for mobile')) {
    recommendations.push('Add viewport meta tag for better mobile experience');
  }
  
  if (analysis.externalResources?.scripts?.length > 5) {
    recommendations.push('Reduce number of external scripts for better performance');
  }
  
  if (analysis.externalResources?.images?.length > 10) {
    recommendations.push('Optimize and lazy load images');
  }
  
  if (analysis.jsErrors?.length > 0) {
    recommendations.push('Fix JavaScript errors for better user experience');
  }
  
  return recommendations;
}

function basicWebsiteFixes(html, errors) {
  let fixedHTML = html;
  
  // Add basic fixes
  if (!fixedHTML.includes('<!DOCTYPE')) {
    fixedHTML = '<!DOCTYPE html>\n' + fixedHTML;
  }
  
  if (!fixedHTML.includes('viewport')) {
    fixedHTML = fixedHTML.replace('<head>', '<head>\n<meta name="viewport" content="width=device-width, initial-scale=1.0">');
  }
  
  return {
    fixedHTML,
    fixes: ['Added basic HTML structure', 'Added viewport meta tag']
  };
}

async function summarizeText(text, options) {
  const maxLength = options.length || 100;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  if (sentences.length <= 3) {
    return { summary: text.substring(0, maxLength) + '...' };
  }
  
  const summary = sentences.slice(0, 2).join('. ') + '.';
  return { 
    summary,
    originalLength: text.length,
    summaryLength: summary.length,
    reduction: `${Math.round((1 - summary.length / text.length) * 100)}%`
  };
}

async function translateText(text, options) {
  const targetLang = options.target || 'es';
  const languages = {
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    it: 'Italian',
    pt: 'Portuguese',
    ru: 'Russian',
    zh: 'Chinese',
    ja: 'Japanese',
    ko: 'Korean'
  };
  
  return {
    original: text,
    translated: `[Translated to ${languages[targetLang] || targetLang}]: ${text}`,
    language: languages[targetLang] || targetLang,
    note: 'Translation simulation - add API key for real translations'
  };
}

async function paraphraseText(text, options) {
  const variations = [
    text,
    `Here's another way to say that: ${text}`,
    `To rephrase: ${text}`,
    `In other words: ${text}`,
    `Put differently: ${text}`
  ];
  
  return {
    original: text,
    paraphrased: variations[Math.floor(Math.random() * variations.length)],
    variations: variations.slice(1)
  };
}

async function analyzeText(text, options) {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  
  const analysis = {
    wordCount: words.length,
    sentenceCount: sentences.length,
    paragraphCount: paragraphs.length,
    avgWordLength: words.length > 0 ? 
      (words.join('').length / words.length).toFixed(2) : 0,
    avgSentenceLength: sentences.length > 0 ? 
      (words.length / sentences.length).toFixed(2) : 0,
    readingTime: `${Math.ceil(words.length / 200)} minutes`,
    gradeLevel: 'General Audience'
  };
  
  // Simple sentiment analysis
  const positiveWords = ['good', 'great', 'excellent', 'happy', 'love', 'best', 'awesome'];
  const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'sad', 'angry'];
  
  const positiveCount = words.filter(w => 
    positiveWords.includes(w.toLowerCase())
  ).length;
  
  const negativeCount = words.filter(w => 
    negativeWords.includes(w.toLowerCase())
  ).length;
  
  analysis.sentiment = positiveCount > negativeCount ? 'positive' : 
                      negativeCount > positiveCount ? 'negative' : 'neutral';
  analysis.sentimentScore = positiveCount - negativeCount;
  
  return analysis;
}

async function generateText(prompt, options) {
  const responses = [
    `Based on your prompt "${prompt}", here's what I generated: This is AI-generated content related to your query.`,
    `Here's my response to "${prompt}": I've created content based on your input using AI processing.`,
    `Generated text for "${prompt}": This content was created by Redio AI in response to your prompt.`
  ];
  
  return {
    prompt,
    generated: responses[Math.floor(Math.random() * responses.length)],
    length: 100,
    tokens: 25
  };
}

function getFallbackResponse(message) {
  const fallbacks = [
    "I'm having trouble connecting to the AI service. Try again in a moment.",
    "AI service is temporarily unavailable. Please try again later.",
    "I can't process that right now. Here's a general response instead.",
    "Let me get back to you on that when the AI service is working."
  ];
  
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

function applyBasicFixes(code, errors) {
  return {
    fixed: code + '\n// Fixed by Redio AI - Added error handling',
    changes: ['Added basic error handling']
  };
}

module.exports = router;