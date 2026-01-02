const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());

// 存储对话历史（实际应用中应使用数据库）
const conversationHistory = new Map();

// AI对话接口 - 支持流式响应
app.post('/api/chat', async (req, res) => {
  try {
    const { message, userId = 'default', stream = true } = req.body;

    if (!message) {
      return res.status(400).json({ error: '消息不能为空' });
    }
    // 获取或初始化用户对话历史
    if (!conversationHistory.has(userId)) {
      conversationHistory.set(userId, []);
    }
    const history = conversationHistory.get(userId);

    // 添加用户消息到历史
    history.push({ role: 'user', content: message });

    // 检查是否有 DeepSeek API 密钥
    if (process.env.DEEPSEEK_API_KEY) {
      // 使用 DeepSeek API（支持流式响应）
      if (stream) {
        // 流式响应
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        try {
          const response = await axios.post(
            'https://api.deepseek.com/chat/completions',
            {
              model: 'deepseek-chat',
              messages: [
                { role: 'system', content: 'You are a helpful assistant.' },
                ...history.slice(-10) // 只保留最近10条消息
              ],
              stream: true,
              temperature: 0.7
            },
            {
              headers: {
                'Authorization': `Bearer ${'sk-a324e429a0f24a80b68c82e55e4343b0'}`,
                'Content-Type': 'application/json'
              },
              responseType: 'stream'
            }
          );

          let fullResponse = '';
          
          let buffer = '';
          
          response.data.on('data', (chunk) => {
            buffer += chunk.toString();
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // 保留不完整的行
            
            for (const line of lines) {
              if (line.trim() === '') continue;
              
              if (line.startsWith('data: ')) {
                const data = line.slice(6).trim();
                
                if (data === '[DONE]') {
                  // 流式响应完成
                  history.push({ role: 'assistant', content: fullResponse });
                  
                  // 限制历史记录长度
                  if (history.length > 20) {
                    history.splice(0, history.length - 20);
                  }
                  
                  res.write(`data: ${JSON.stringify({ done: true, fullText: fullResponse })}\n\n`);
                  res.end();
                  return;
                }
                
                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  
                  if (content) {
                    fullResponse += content;
                    res.write(`data: ${JSON.stringify({ content, fullText: fullResponse })}\n\n`);
                  }
                } catch (e) {
                  // 忽略解析错误
                  console.error('解析流式数据错误:', e, data);
                }
              }
            }
          });

          response.data.on('end', () => {
            // 确保响应结束
            if (!res.headersSent || res.writable) {
              history.push({ role: 'assistant', content: fullResponse });
              if (history.length > 20) {
                history.splice(0, history.length - 20);
              }
              res.write(`data: ${JSON.stringify({ done: true, fullText: fullResponse })}\n\n`);
              res.end();
            }
          });

          response.data.on('error', (error) => {
            console.error('DeepSeek API流式错误:', error);
            if (!res.headersSent || res.writable) {
              res.write(`data: ${JSON.stringify({ error: '流式响应错误: ' + error.message })}\n\n`);
              res.end();
            }
          });

        } catch (apiError) {
          // API 调用失败（如网络错误、认证错误等）
          console.error('DeepSeek API调用失败:', apiError.response?.data || apiError.message);
          const errorMessage = apiError.response?.data?.error?.message || 
                              apiError.response?.status === 401 ? 'API密钥无效，请检查配置' :
                              apiError.response?.status === 429 ? 'API调用频率过高，请稍后再试' :
                              apiError.message || 'API调用失败';
          
          if (!res.headersSent || res.writable) {
            res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
            res.end();
          }
        }
      } else {
        // 非流式响应（兼容旧接口）
        try {
          const response = await axios.post(
            'https://api.deepseek.com/chat/completions',
            {
              model: 'deepseek-chat',
              messages: [
                { role: 'system', content: 'You are a helpful assistant.' },
                ...history.slice(-10)
              ],
              temperature: 0.7
            },
            {
              headers: {
                'Authorization': `Bearer ${'sk-a324e429a0f24a80b68c82e55e4343b0'}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          const aiResponse = response.data.choices[0].message.content;
          history.push({ role: 'assistant', content: aiResponse });
          
          if (history.length > 20) {
            history.splice(0, history.length - 20);
          }

          res.json({ 
            response: aiResponse,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error('DeepSeek API错误:', error.response?.data || error.message);
          const errorMessage = error.response?.data?.error?.message || 
                              error.response?.status === 401 ? 'API密钥无效，请检查配置' :
                              error.response?.status === 429 ? 'API调用频率过高，请稍后再试' :
                              error.message || 'API调用失败';
          res.json({ 
            response: errorMessage,
            timestamp: new Date().toISOString()
          });
        }
      }
    } else if (process.env.OPENAI_API_KEY) {
      // 如果有OpenAI API密钥，使用真实API（非流式）
      try {
        const response = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: 'gpt-3.5-turbo',
            messages: history.slice(-10),
            temperature: 0.7,
            max_tokens: 500
          },
          {
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );
        const aiResponse = response.data.choices[0].message.content;
        history.push({ role: 'assistant', content: aiResponse });
        
        if (history.length > 20) {
          history.splice(0, history.length - 20);
        }

        res.json({ 
          response: aiResponse,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('OpenAI API错误:', error.response?.data || error.message);
        const aiResponse = generateMockResponse(message);
        res.json({ 
          response: aiResponse,
          timestamp: new Date().toISOString()
        });
      }
    } else {
      // 使用模拟AI响应
      const aiResponse = generateMockResponse(message);
      history.push({ role: 'assistant', content: aiResponse });
      
      if (history.length > 20) {
        history.splice(0, history.length - 20);
      }

      res.json({ 
        response: aiResponse,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('服务器错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 获取对话历史
app.get('/api/history/:userId', (req, res) => {
  const { userId } = req.params;
  const history = conversationHistory.get(userId) || [];
  res.json({ history });
});

// 清除对话历史
app.delete('/api/history/:userId', (req, res) => {
  const { userId } = req.params;
  conversationHistory.delete(userId);
  res.json({ message: '对话历史已清除' });
});

// 模拟AI响应函数（当没有API密钥时使用）
function generateMockResponse(userMessage) {
  const responses = [
    '我理解您的问题。让我为您详细解释一下...',
    '这是一个很好的问题。根据我的理解...',
    '感谢您的提问。我认为...',
    '关于这个问题，我可以从以下几个方面来回答...',
    '您提到的这一点很重要。让我为您分析一下...'
  ];
  
  const message = userMessage.toLowerCase();
  
  if (message.includes('你好') || message.includes('hello')) {
    return '您好！我是您的AI助手，很高兴为您服务。有什么我可以帮助您的吗？';
  } else if (message.includes('时间') || message.includes('time')) {
    return `当前时间是：${new Date().toLocaleString('zh-CN')}`;
  } else if (message.includes('天气') || message.includes('weather')) {
    return '抱歉，我目前无法获取实时天气信息。建议您查看天气应用或网站获取准确的天气预报。';
  } else if (message.includes('帮助') || message.includes('help')) {
    return '我可以帮助您回答问题、提供建议、进行对话等。请随时向我提问！';
  } else {
    return responses[Math.floor(Math.random() * responses.length)] + 
           ` 您说的是关于"${userMessage}"的问题，这是一个很有趣的话题。`;
  }
}

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  if (process.env.DEEPSEEK_API_KEY) {
    console.log(`AI API状态: DeepSeek API 已配置（支持流式响应）`);
  } else if (process.env.OPENAI_API_KEY) {
    console.log(`AI API状态: OpenAI API 已配置`);
  } else {
    console.log(`AI API状态: 使用模拟模式`);
  }
});

