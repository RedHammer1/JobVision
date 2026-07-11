import React, { useState, useRef, useEffect } from 'react';
import './MessageInput.css';

interface MessageInputProps {
    onSendMessage: (text: string) => Promise<unknown>;
    onTyping: (isTyping: boolean) => void;
    disabled?: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({
    onSendMessage,
    onTyping,
    disabled = false,
}) => {
    const [inputMessage, setInputMessage] = useState('');
    const [sending, setSending] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(
                textareaRef.current.scrollHeight,
                80
            ) + 'px';
        }
    }, [inputMessage]);

    const handleSend = async () => {
        if (!inputMessage.trim() || disabled || sending) return;
        
        setSending(true);
        try {
            await onSendMessage(inputMessage.trim());
            setInputMessage('');
            onTyping(false);

            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
            }
        } catch (err) {
            console.error('Ошибка отправки:', err);
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setInputMessage(value);
        onTyping(value.length > 0);
    };

    return (
        <div className="message-input">
            <textarea
                ref={textareaRef}
                className="message-input__field"
                placeholder="Напишите сообщение..."
                value={inputMessage}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                rows={1}
                disabled={disabled || sending}
                style={{ overflow: 'hidden' }} 
            />
            <button
                className="message-input__send"
                onClick={handleSend}
                disabled={!inputMessage.trim() || disabled || sending}
            >
                ➤
            </button>
        </div>
    );
};

export default MessageInput;