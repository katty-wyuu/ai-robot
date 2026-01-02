import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import MessageItem from './MessageItem';
import './ChatInterface.css';

const ChatInterface = () => {
  const initialMessage = {
    id: 1,
    text: '',
    sender: 'ai',
    timestamp: new Date(),
    isTyping: true,
    fullText: '您好！我是您的AI助手，很高兴为您服务。有什么我可以帮助您的吗？'
  };

  const [messages, setMessages] = useState([initialMessage]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [typingMessageId, setTypingMessageId] = useState(1); // 初始消息也需要打字效果
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const userId = 'user-' + Date.now();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 监听打字机效果，自动滚动
  useEffect(() => {
    if (typingMessageId) {
      const interval = setInterval(() => {
        scrollToBottom();
      }, 200); // 每200ms滚动一次，平衡性能和流畅度
      return () => clearInterval(interval);
    }
  }, [typingMessageId]);

  const handleTypingComplete = (messageId) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        return { ...msg, text: msg.fullText, isTyping: false };
      }
      return msg;
    }));
    setTypingMessageId(null);
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const messageText = inputValue.trim();
    const userMessage = {
      id: Date.now(),
      text: messageText,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    const messageId = Date.now() + 1;
    
    // 创建AI消息占位符
    const aiMessage = {
      id: messageId,
      text: '',
      sender: 'ai',
      timestamp: new Date(),
      isTyping: true,
      fullText: ''
    };

    setMessages(prev => [...prev, aiMessage]);
    setTypingMessageId(messageId);

    try {
      // 使用 fetch 支持流式响应
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageText,
          userId: userId,
          stream: true
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // 检查是否是流式响应
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/event-stream')) {
        // 流式响应处理
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullText = '';

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              
              if (data === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(data);
                
                if (parsed.done) {
                  // 流式响应完成
                  setMessages(prev => prev.map(msg => 
                    msg.id === messageId 
                      ? { ...msg, text: parsed.fullText, fullText: parsed.fullText, isTyping: false }
                      : msg
                  ));
                  setTypingMessageId(null);
                  break;
                } else if (parsed.content) {
                  // 更新文本
                  fullText = parsed.fullText || fullText + parsed.content;
                  setMessages(prev => prev.map(msg => 
                    msg.id === messageId 
                      ? { ...msg, fullText: fullText }
                      : msg
                  ));
                } else if (parsed.error) {
                  // 收到错误信息，显示给用户
                  const errorText = parsed.error || 'API调用失败';
                  setMessages(prev => prev.map(msg => 
                    msg.id === messageId 
                      ? { ...msg, fullText: errorText, isTyping: true }
                      : msg
                  ));
                  setTypingMessageId(null);
                  break;
                }
              } catch (e) {
                // JSON 解析错误，忽略无效数据
                console.error('解析流式数据错误:', e, data);
              }
            }
          }
        }
      } else {
        // 非流式响应（兼容旧接口）
        const data = await response.json();
        const fullText = data.response;
        
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, fullText: fullText, isTyping: true }
            : msg
        ));
      }
      
    } catch (error) {
      console.error('发送消息错误:', error);
      const errorText = error.message || '抱歉，发生了错误。请检查网络连接或稍后再试。';
      
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, fullText: errorText, isTyping: true }
          : msg
      ));
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    // 自动调整textarea高度
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  };

  const handleClear = () => {
    const clearText = '对话历史已清除。有什么我可以帮助您的吗？';
    const clearMessageId = Date.now();
    setMessages([
      {
        id: clearMessageId,
        text: '',
        sender: 'ai',
        timestamp: new Date(),
        isTyping: true,
        fullText: clearText
      }
    ]);
    setTypingMessageId(clearMessageId);
    axios.delete(`/api/history/${userId}`).catch(console.error);
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="header-content">
          <div className="header-icon">🤖</div>
          <div className="header-text">
            <h1>智能对话AI助手</h1>
            <p>随时为您提供帮助</p>
          </div>
        </div>
        <button className="clear-button" onClick={handleClear} title="清除对话">
          🗑️
        </button>
      </div>

      <div className="chat-messages">
        {messages.map((message) => {
          const isCurrentlyTyping = message.id === typingMessageId && message.isTyping;
          return (
            <MessageItem
              key={message.id}
              message={message}
              isTyping={isCurrentlyTyping}
              onTypingComplete={handleTypingComplete}
            />
          );
        })}
        {isLoading && (
          <div className="message ai-message">
            <div className="message-avatar">🤖</div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <div className="chat-input-wrapper">
          <textarea
            ref={inputRef}
            className="chat-input"
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="输入您的消息... (按Enter发送，Shift+Enter换行)"
            rows="1"
            disabled={isLoading}
          />
          <button
            className="send-button"
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
          >
            {isLoading ? '⏳' : '📤'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;

