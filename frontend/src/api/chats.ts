const API_URL = 'http://localhost:8080/api';

export interface Chat {
    id: number;
    name: string | null;
    type: 'private' | 'group';
    created_by: number;
    created_at: string;
    updated_at: string;
    participants: { id: number; name: string; tag: string; role: string }[];
    last_message?: {
        id: number;
        text: string;
        sender_id: number;
        sender_name: string;
        created_at: string;
    };
}

export interface Message {
    id: number;
    chat_id: number;
    sender_id: number;
    sender_name: string;
    text: string;
    created_at: string;
    updated_at: string;
    isOwn?: boolean;
    vacancy_id?: string | null;
    vacancy_title?: string | null;
    salary?: string | null;
    url?: string | null;
    city?: string | null;
    recommended_by?: number | null;
    is_recommended?: boolean;
    recommended_at?: string | null;
    required_test_id?: number | null;
    test_title?: string | null;
    test_passed?: boolean;
}


export const getUserChats = async (userId: number): Promise<Chat[]> => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/chats/${userId}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error('Ошибка загрузки чатов');
    }

    return response.json();
};

export const getChat = async (userId: number, chatId: number): Promise<Chat> => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/chats/${userId}/chat/${chatId}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error('Ошибка загрузки чата');
    }

    return response.json();
};

export const getMessages = async (userId: number, chatId: number, limit: number = 50): Promise<Message[]> => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/chats/${userId}/chat/${chatId}/messages?limit=${limit}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error('Ошибка загрузки сообщений');
    }

    return response.json();
};

export const createPrivateChat = async (userId1: number, userId2: number): Promise<Chat> => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/chats/private`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId1, userId2 }),
    });

    if (!response.ok) {
        throw new Error('Ошибка создания чата');
    }

    return response.json();
};

export const createGroupChat = async (name: string, createdBy: number, participants: number[]): Promise<Chat> => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/chats/group`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, createdBy, participants }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка создания группы');
    }

    return response.json();
};

export const addParticipant = async (chatId: number, targetUserId: number, currentUserId: number): Promise<void> => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/chats/group/${chatId}/add-participant`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ targetUserId, currentUserId }),
    });

    if (!response.ok) {
        throw new Error('Ошибка добавления участника');
    }
};

export const removeParticipant = async (chatId: number, targetUserId: number, currentUserId: number): Promise<void> => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/chats/group/${chatId}/remove-participant`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ targetUserId, currentUserId }),
    });

    if (!response.ok) {
        throw new Error('Ошибка удаления участника');
    }
};

export const leaveGroup = async (chatId: number, userId: number): Promise<void> => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/chats/group/${chatId}/leave`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
        throw new Error('Ошибка выхода из группы');
    }
};

export const getRoleInChat = async (userId: number, chatId: number): Promise<string> => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/chats/${userId}/chat/${chatId}/role`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        return 'none';
    }

    const data = await response.json();
    return data.role;
};

export const deleteGroup = async (chatId: number, userId: number): Promise<void> => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/chats/group/${chatId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка удаления группы');
    }
};
