import React, { useState, useRef, useEffect } from 'react';
import { Bot, User, Send, Reply, Trash2 } from 'lucide-react';
import { digitsEnToFa } from 'persian-tools';
import axios from 'axios';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  replyTo?: string;
  timestamp: number;
}

const API_BASE_URL = 'https://generativelanguage.googleapis.com';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('isAuthenticated') === 'true';
  });
  const [password, setPassword] = useState('');
  const [messages, setMessages] = useState<Message[]>(() => {
    const savedMessages = localStorage.getItem('chatMessages');
    return savedMessages ? JSON.parse(savedMessages) : [];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('isAuthenticated', isAuthenticated.toString());
  }, [isAuthenticated]);

  useEffect(() => {
    localStorage.setItem('chatMessages', JSON.stringify(messages));
  }, [messages]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'hosna') {
      setIsAuthenticated(true);
      if (messages.length === 0) {
        setMessages([
          {
            id: crypto.randomUUID(),
            text: 'سلام! من یک دستیار هوش مصنوعی هستم که برای کمک به حسنا ساخته شده‌ام. چطور می‌تونم کمکتون کنم؟',
            sender: 'ai',
            timestamp: Date.now()
          }
        ]);
      }
    } else {
      alert('رمز عبور اشتباه است!');
    }
  };

  const getReplyContext = (replyId: string | null) => {
    if (!replyId) return '';
    const replyMessage = messages.find(m => m.id === replyId);
    if (!replyMessage) return '';
    return `در پاسخ به پیام: "${replyMessage.text}"\n\n`;
  };

  const getConversationHistory = () => {
    // آخرین 5 پیام را برای حافظه مکالمه استفاده می‌کنیم
    return messages.slice(-5).map(m => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    const newMessageId = crypto.randomUUID();
    
    setInput('');
    setMessages(prev => [...prev, {
      id: newMessageId,
      text: userMessage,
      sender: 'user',
      replyTo: replyingTo,
      timestamp: Date.now()
    }]);
    
    setReplyingTo(null);
    setIsLoading(true);

    try {
      const replyContext = getReplyContext(replyingTo);
      const conversationHistory = getConversationHistory();
      
      const response = await axios.post(
        `${API_BASE_URL}/v1beta/models/gemini-1.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
        {
          contents: [{
            parts: [{
              text: `You are an AI assistant created to help Hosna. Always respond in Persian (Farsi) language with a helpful and supportive tone. Remember that you are not Hosna - you are an AI assistant created to help her.

Previous conversation:
${conversationHistory.map(m => `${m.role}: ${m.text}`).join('\n')}

${replyContext}Current message: ${userMessage}`
            }]
          }]
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          proxy: {
            host: '78.157.42.100',
            port: 443,
            protocol: 'https'
          }
        }
      );

      const aiResponse = response.data.candidates[0].content.parts[0].text;
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        text: aiResponse,
        sender: 'ai',
        timestamp: Date.now()
      }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        text: 'متأسفانه در پردازش پیام شما مشکلی پیش آمد. لطفاً دوباره تلاش کنید.',
        sender: 'ai',
        timestamp: Date.now()
      }]);
    }

    setIsLoading(false);
  };

  const handleReply = (messageId: string) => {
    setReplyingTo(messageId);
    const messageElement = document.querySelector('input[type="text"]');
    if (messageElement) {
      messageElement.focus();
    }
  };

  const clearChat = () => {
    if (window.confirm('آیا مطمئن هستید که می‌خواهید تاریخچه چت را پاک کنید؟')) {
      setMessages([]);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
          <h1 className="text-2xl font-bold text-center mb-6">ورود به چت با دستیار هوش مصنوعی</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-gray-700 mb-2">رمز عبور</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="رمز عبور را وارد کنید"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              ورود
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col p-4">
      <div className="chat-container flex-1 rounded-lg shadow-xl p-4 mb-4 overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold text-gray-800">چت با دستیار هوش مصنوعی</h1>
          <button
            onClick={clearChat}
            className="text-red-600 hover:text-red-700 p-2 rounded-lg flex items-center gap-2"
          >
            <Trash2 className="w-5 h-5" />
            پاک کردن تاریخچه
          </button>
        </div>
        <div className="flex-1 overflow-y-auto mb-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`message-bubble ${
                message.sender === 'user' ? 'user-message' : 'ai-message'
              } flex items-start gap-2`}
            >
              {message.sender === 'ai' ? (
                <Bot className="w-6 h-6 mt-1" />
              ) : (
                <User className="w-6 h-6 mt-1" />
              )}
              <div className="flex-1">
                {message.replyTo && (
                  <div className="reply-to text-sm text-gray-600 mb-2 bg-gray-100 p-2 rounded">
                    {messages.find(m => m.id === message.replyTo)?.text}
                  </div>
                )}
                <div>{digitsEnToFa(message.text)}</div>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => handleReply(message.id)}
                    className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1"
                  >
                    <Reply className="w-4 h-4" />
                    پاسخ
                  </button>
                  <span className="text-gray-400 text-xs">
                    {new Date(message.timestamp).toLocaleTimeString('fa-IR')}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="message-bubble ai-message flex items-center gap-2">
              <Bot className="w-6 h-6" />
              <div>در حال تایپ...</div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        {replyingTo && (
          <div className="bg-gray-100 p-2 rounded-lg mb-2 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              در حال پاسخ به: {messages.find(m => m.id === replyingTo)?.text}
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="پیام خود را بنویسید..."
          />
          <button
            type="submit"
            className="bg-purple-600 text-white p-2 rounded-lg hover:bg-purple-700 transition-colors"
            disabled={isLoading}
          >
            <Send className="w-6 h-6" />
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;
