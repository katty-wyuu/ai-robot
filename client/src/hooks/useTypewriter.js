import { useState, useEffect, useRef } from 'react';

/**
 * 打字机效果 Hook
 * @param {string} text - 要显示的完整文本
 * @param {number} speed - 打字速度（毫秒），默认 30ms
 * @param {boolean} start - 是否开始打字，默认 true
 * @param {function} onComplete - 完成时的回调函数
 * @returns {object} { displayedText, isTyping }
 */
export const useTypewriter = (text, speed = 30, start = true, onComplete = null) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const timeoutRef = useRef(null);
  const onCompleteRef = useRef(onComplete);
  const mountedRef = useRef(true);
  const typingIdRef = useRef(0); // 用于跟踪当前打字任务的ID

  // 更新回调引用
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // 组件挂载状态
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // 打字效果
  useEffect(() => {
    // 清理之前的定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // 如果不需要开始或没有文本
    if (!start || !text || text.length === 0) {
      if (!text || text.length === 0) {
        setDisplayedText('');
        setIsTyping(false);
      }
      return;
    }

    // 生成新的打字任务ID
    const currentTypingId = ++typingIdRef.current;
    
    // 重置状态
    setDisplayedText('');
    setIsTyping(true);
    
    let currentIndex = 0;
    const targetText = text;

    const type = () => {
      // 检查是否还是当前任务
      if (currentTypingId !== typingIdRef.current) {
        return;
      }

      // 检查组件是否还挂载
      if (!mountedRef.current) {
        return;
      }

      if (currentIndex < targetText.length) {
        const newText = targetText.substring(0, currentIndex + 1);
        setDisplayedText(newText);
        currentIndex++;
        timeoutRef.current = setTimeout(type, speed);
      } else {
        // 打字完成
        setIsTyping(false);
        if (onCompleteRef.current) {
          onCompleteRef.current();
        }
      }
    };

    // 开始打字
    type();

    // 清理函数 - 取消当前任务
    return () => {
      // 取消当前打字任务
      typingIdRef.current++;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [text, speed, start]);

  return { displayedText, isTyping };
};
