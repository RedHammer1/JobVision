export interface User {
    id: number;
    name: string;
    email: string;
    tag: string;
    role: 'student' | 'teacher';
    created_at?: Date;
}

export interface Message {
    id: number;
    chat_id: number;
    sender_id: number;
    sender_name: string;
    text: string;
    vacancy_id?: string;
    recommended_by?: number;
    is_recommended: boolean;
    created_at: string;
    updated_at: string;
    isOwn?: boolean;
    vacancy_title?: string;
    salary?: string;
    url?: string;
    city?: string;
}

export interface Chat {
    id: string;
    name: string;
    type: 'private' | 'group';
    participants: User[];
    lastMessage?: Message;
    createdAt: Date;
}

export interface Vacancy {
    id: string;
    title: string;
    salary: string;
    url: string;
    city: string;
    scraped_at: Date;
}

export interface SocketEventMap {
    'join': { userId: string; chatId?: string };
    'send_message': Message;
    'new_message': Message;
    'typing': { chatId: string; userId: string; isTyping: boolean };
    'user_typing': { chatId: string; userId: string; userName: string; isTyping: boolean };
    'disconnect': { userId: string };
    'user_connected': { userId: string; userName: string };
    'user_disconnected': { userId: string; userName: string };
}