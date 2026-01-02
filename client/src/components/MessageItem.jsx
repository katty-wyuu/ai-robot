import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import { useTypewriter } from '../hooks/useTypewriter';

const MessageItem = ({ message, isTyping, onTypingComplete }) => {
  // 判断是否需要打字：有完整文本但还没有显示文本，且当前正在打字
  const shouldType = isTyping && message.fullText && !message.text;
  
  // 使用 ref 锁定打字状态，一旦开始就不改变
  const typingStartedRef = useRef(false);
  const lockedTextRef = useRef('');
  const lockedStartRef = useRef(false);

  // 立即检查并锁定状态（同步执行，不等待 useEffect）
  if (shouldType && message.fullText && !typingStartedRef.current) {
    typingStartedRef.current = true;
    lockedTextRef.current = message.fullText;
    lockedStartRef.current = true;
  }
  
  // 如果已经有文本了，重置锁定状态（用于下次打字）
  if (message.text && message.text === message.fullText && typingStartedRef.current) {
    typingStartedRef.current = false;
    lockedTextRef.current = '';
    lockedStartRef.current = false;
  }
  
  // 使用锁定的值
  const typewriterText = typingStartedRef.current ? lockedTextRef.current : '';
  const typewriterStart = typingStartedRef.current ? lockedStartRef.current : false;
  
  // 使用 useCallback 稳定回调函数
  const handleComplete = useCallback(() => {
    typingStartedRef.current = false;
    lockedTextRef.current = '';
    lockedStartRef.current = false;
    if (onTypingComplete) {
      onTypingComplete(message.id);
    }
  }, [onTypingComplete, message.id]);
  
  // 使用打字机效果
  const { displayedText, isTyping: isCurrentlyTyping } = useTypewriter(
    typewriterText,
    30,
    typewriterStart,
    typewriterStart ? handleComplete : null
  );

  // 确定显示的文本
  // 关键逻辑：如果需要打字（shouldType为true），即使打字还没开始，也不应该显示fullText
  // 只有在确实不需要打字时才显示完整文本
  let displayText = '';
  if (shouldType || typingStartedRef.current) {
    // 需要打字：显示打字机文本，如果还没开始则显示空字符串
    displayText = isCurrentlyTyping && displayedText ? displayedText : '';
  } else {
    // 不需要打字：显示已完成的文本或完整文本
    displayText = message.text || message.fullText || '';
  }

  return (
    <div
      className={`message ${message.sender === 'user' ? 'user-message' : 'ai-message'}`}
    >
      <div className="message-avatar">
        {message.sender === 'user' ? '👤' : '🤖'}
      </div>
      <div className="message-content">
        <div className="message-text">
          {displayText}
          {(shouldType || typingStartedRef.current) && isCurrentlyTyping && (
            <span className="typewriter-cursor">|</span>
          )}
        </div>
        <div className="message-time">
          {message.timestamp.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </div>
    </div>
  );
};

export default MessageItem;

