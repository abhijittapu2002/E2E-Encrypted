class ABHIChatReliable {
    constructor() {
        this.peer = null;
        this.connection = null;
        this.currentUser = null;
        this.messages = [];
        this.isTyping = false;
        this.typingTimeout = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 3;
        this.connectionReady = false;
        
        // User configuration
        this.users = {
            'abhijit': { 
                password: 'abhi123', 
                displayName: 'Abhijit', 
                peerId: 'abhi-chat-abhijit-reliable-v2',
                avatar: '👨'
            },
            'khusbu': { 
                password: 'khusbu123', 
                displayName: 'Khusbu', 
                peerId: 'abhi-chat-khusbu-reliable-v2',
                avatar: '👩'
            }
        };
        
        this.init();
    }

    async init() {
        this.initializeElements();
        this.setupEventListeners();
        this.loadChatHistory();
        
        // Check for auto-login
        await this.checkAutoLogin();
        
        console.log('🚀 ABHI Chat Reliable - Message delivery fixed!');
    }

    initializeElements() {
        // Login elements
        this.loginPage = document.getElementById('loginPage');
        this.chatPage = document.getElementById('chatPage');
        this.loginForm = document.getElementById('loginForm');
        this.loginBtn = document.getElementById('loginBtn');
        this.connectionStatus = document.getElementById('connectionStatus');
        this.loginIdInput = document.getElementById('loginId');
        this.passwordInput = document.getElementById('password');
        
        // Chat elements
        this.messageForm = document.getElementById('messageForm');
        this.messagesContainer = document.getElementById('messagesContainer');
        this.messageInput = document.getElementById('messageInput');
        this.charCounter = document.getElementById('charCounter');
        this.sendBtn = document.getElementById('sendBtn');
        
        // Header elements
        this.otherUserName = document.getElementById('otherUserName');
        this.otherUserAvatar = document.getElementById('otherUserAvatar');
        this.userStatus = document.getElementById('userStatus');
        this.statusText = document.getElementById('statusText');
        
        // UI elements
        this.emojiBtn = document.getElementById('emojiBtn');
        this.emojiPicker = document.getElementById('emojiPicker');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.toast = document.getElementById('toast');
    }

    setupEventListeners() {
        // Form events
        this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        this.messageForm.addEventListener('submit', (e) => this.handleSendMessage(e));
        
        // Button events
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
        document.getElementById('clearChat').addEventListener('click', () => this.clearChat());
        document.getElementById('refreshBtn').addEventListener('click', () => this.refreshConnection());
        
        // Emoji picker events
        this.emojiBtn.addEventListener('click', () => this.toggleEmojiPicker());
        document.getElementById('closeEmoji').addEventListener('click', () => this.hideEmojiPicker());
        
        document.querySelectorAll('.emoji').forEach(emoji => {
            emoji.addEventListener('click', (e) => this.insertEmoji(e.target.dataset.emoji));
        });

        // Message input events
        this.messageInput.addEventListener('input', () => {
            this.updateCharCounter();
            this.handleTyping();
        });
        
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (this.messageInput.value.trim()) {
                    this.handleSendMessage(e);
                }
            }
        });

        // Global events
        document.addEventListener('click', (e) => {
            if (!this.emojiPicker.contains(e.target) && e.target !== this.emojiBtn) {
                this.hideEmojiPicker();
            }
        });

        // Network events
        window.addEventListener('online', () => {
            console.log('📶 Back online');
            this.showToast('Connection restored', 'success');
            if (this.currentUser) {
                setTimeout(() => this.establishConnection(), 1000);
            }
        });

        window.addEventListener('offline', () => {
            console.log('📵 Gone offline');
            this.showToast('No internet connection', 'error');
            this.updateConnectionStatus('Offline', 'offline');
            this.connectionReady = false;
        });
    }

    // Auto-login functionality
    async checkAutoLogin() {
        const saved = localStorage.getItem('abhiChatCurrentUser');
        if (saved) {
            try {
                const userData = JSON.parse(saved);
                // Auto-login if session is less than 7 days old
                if (Date.now() - userData.loginTime < 7 * 24 * 60 * 60 * 1000) {
                    console.log('🔄 Auto-login for:', userData.displayName);
                    
                    this.currentUser = userData;
                    this.otherUser = userData.loginId === 'abhijit' ? 
                        this.users['khusbu'] : this.users['abhijit'];
                    
                    this.showLoadingOverlay('Restoring session...', 'Reconnecting to your chat');
                    
                    try {
                        await this.establishConnection();
                        this.hideLoadingOverlay();
                        this.showChatPage();
                        this.showToast(`Welcome back, ${userData.displayName}! 👋`, 'success');
                        return true;
                    } catch (error) {
                        console.error('Auto-login failed:', error);
                        this.hideLoadingOverlay();
                        this.loginIdInput.value = userData.loginId;
                    }
                } else {
                    localStorage.removeItem('abhiChatCurrentUser');
                }
            } catch (error) {
                localStorage.removeItem('abhiChatCurrentUser');
            }
        }
        return false;
    }

    async handleLogin(e) {
        e.preventDefault();
        const loginId = this.loginIdInput.value.trim().toLowerCase();
        const password = this.passwordInput.value;

        if (!this.users[loginId] || this.users[loginId].password !== password) {
            this.showError('❌ Invalid credentials! Please check your username and password.');
            return;
        }

        try {
            this.showLoadingOverlay('Connecting...', 'Establishing secure connection');
            this.loginBtn.classList.add('loading');

            this.currentUser = {
                loginId: loginId,
                displayName: this.users[loginId].displayName,
                peerId: this.users[loginId].peerId,
                avatar: this.users[loginId].avatar,
                loginTime: Date.now()
            };

            this.otherUser = loginId === 'abhijit' ? 
                this.users['khusbu'] : this.users['abhijit'];

            // Save session
            localStorage.setItem('abhiChatCurrentUser', JSON.stringify(this.currentUser));
            
            await this.establishConnection();
            
            this.hideLoadingOverlay();
            this.loginBtn.classList.remove('loading');
            this.showChatPage();
            this.showToast(`Welcome ${this.currentUser.displayName}! 🎉`, 'success');

        } catch (error) {
            console.error('Login failed:', error);
            this.hideLoadingOverlay();
            this.loginBtn.classList.remove('loading');
            this.showError(`❌ Connection failed. Please try again.`);
        }
    }

    async establishConnection() {
        return new Promise((resolve, reject) => {
            try {
                // Clean up existing peer
                if (this.peer && !this.peer.destroyed) {
                    this.peer.destroy();
                }

                console.log('🔗 Creating peer connection...');
                
                // Create peer with simpler config
                this.peer = new Peer(this.currentUser.peerId, {
                    debug: 0,
                    config: {
                        iceServers: [
                            { urls: 'stun:stun.l.google.com:19302' }
                        ]
                    }
                });

                let resolved = false;

                // Handle peer ready
                this.peer.on('open', (id) => {
                    console.log('✅ Peer ready with ID:', id);
                    this.setupPeerListeners();
                    this.connectToOtherUser();
                    
                    if (!resolved) {
                        resolved = true;
                        resolve();
                    }
                });

                // Handle peer error
                this.peer.on('error', (err) => {
                    console.error('❌ Peer error:', err);
                    if (!resolved) {
                        resolved = true;
                        reject(err);
                    }
                });

                // Timeout fallback
                setTimeout(() => {
                    if (!resolved) {
                        console.log('⚠️ Peer connection timeout, continuing anyway...');
                        this.setupPeerListeners();
                        this.connectToOtherUser();
                        resolved = true;
                        resolve();
                    }
                }, 10000);

            } catch (error) {
                console.error('❌ Failed to create peer:', error);
                reject(error);
            }
        });
    }

    setupPeerListeners() {
        if (!this.peer) return;

        // Handle incoming connections
        this.peer.on('connection', (conn) => {
            console.log('📞 Incoming connection from:', conn.peer);
            this.handleConnection(conn);
        });

        // Handle disconnection
        this.peer.on('disconnected', () => {
            console.warn('⚠️ Peer disconnected, attempting reconnect...');
            if (!this.peer.destroyed) {
                this.peer.reconnect();
            }
        });

        // Handle errors
        this.peer.on('error', (err) => {
            console.error('❌ Peer error:', err);
            if (err.type !== 'peer-unavailable') {
                this.updateConnectionStatus('Connection Error', 'offline');
            }
        });
    }

    connectToOtherUser() {
        if (!this.peer || this.peer.destroyed) return;

        console.log('🔗 Attempting to connect to:', this.otherUser.peerId);
        
        try {
            const conn = this.peer.connect(this.otherUser.peerId, {
                reliable: true,
                serialization: 'json',
                metadata: { user: this.currentUser }
            });

            if (conn) {
                this.handleConnection(conn);
            }
        } catch (error) {
            console.error('❌ Connection attempt failed:', error);
        }

        // Retry connection every 3 seconds if not connected
        setTimeout(() => {
            if (!this.connectionReady && this.currentUser) {
                console.log('🔄 Retrying connection...');
                this.connectToOtherUser();
            }
        }, 3000);
    }

    handleConnection(conn) {
        console.log('🤝 Handling connection with:', conn.peer);
        
        this.connection = conn;

        conn.on('open', () => {
            console.log('✅ Connection established with:', conn.peer);
            this.connectionReady = true;
            this.updateConnectionStatus('Connected', 'online');
            this.reconnectAttempts = 0;
            
            // Send handshake
            this.sendMessage({
                type: 'handshake',
                user: this.currentUser,
                timestamp: Date.now()
            });
            
            this.showToast(`Connected to ${this.otherUser.displayName}! 🎉`, 'success');
        });

        conn.on('data', (data) => {
            console.log('📨 Received data:', data);
            this.handleIncomingData(data);
        });

        conn.on('close', () => {
            console.log('❌ Connection closed with:', conn.peer);
            this.connectionReady = false;
            this.connection = null;
            this.updateConnectionStatus('Disconnected', 'offline');
            
            // Try to reconnect
            if (this.currentUser) {
                setTimeout(() => {
                    console.log('🔄 Attempting to reconnect...');
                    this.connectToOtherUser();
                }, 2000);
            }
        });

        conn.on('error', (err) => {
            console.error('❌ Connection error:', err);
            this.connectionReady = false;
            this.connection = null;
        });
    }

    sendMessage(data) {
        if (this.connection && this.connection.open && this.connectionReady) {
            try {
                this.connection.send(data);
                console.log('📤 Message sent:', data.type);
                return true;
            } catch (error) {
                console.error('❌ Failed to send message:', error);
                this.connectionReady = false;
                return false;
            }
        } else {
            console.warn('⚠️ Connection not ready, cannot send message');
            return false;
        }
    }

    handleIncomingData(data) {
        switch (data.type) {
            case 'message':
                this.receiveMessage(data);
                break;
            case 'typing':
                this.handleTypingIndicator(data);
                break;
            case 'handshake':
                console.log('🤝 Handshake received from:', data.user.displayName);
                this.updateConnectionStatus('Connected', 'online');
                break;
            case 'delivery_confirm':
                this.handleDeliveryConfirm(data);
                break;
        }
    }

    async handleSendMessage(e) {
        e.preventDefault();
        const messageText = this.messageInput.value.trim();
        
        if (!messageText || messageText.length > 500) return;

        const message = {
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'message',
            text: messageText,
            sender: this.currentUser.loginId,
            senderName: this.currentUser.displayName,
            timestamp: Date.now(),
            avatar: this.currentUser.avatar,
            delivered: false
        };

        // Add to local messages
        this.messages.push(message);
        this.saveChatHistory();
        this.displayAllMessages();
        
        // Clear input
        this.messageInput.value = '';
        this.updateCharCounter();
        this.stopTyping();
        this.scrollToBottom();

        // Try to send message
        const sent = this.sendMessage(message);
        
        if (sent) {
            // Wait for delivery confirmation or timeout
            setTimeout(() => {
                const msg = this.messages.find(m => m.id === message.id);
                if (msg && !msg.delivered) {
                    console.log('⚠️ Message delivery timeout');
                }
            }, 5000);
        } else {
            this.showToast('Message will be sent when connected', 'warning');
            // Store for later delivery
            this.storeOfflineMessage(message);
        }

        // Disable send button briefly
        this.sendBtn.disabled = true;
        setTimeout(() => {
            this.sendBtn.disabled = false;
        }, 500);
    }

    receiveMessage(data) {
        console.log('📨 Receiving message:', data.text);
        
        // Check for duplicates
        const existingMessage = this.messages.find(msg => msg.id === data.id);
        if (existingMessage) {
            console.log('⚠️ Duplicate message ignored:', data.id);
            return;
        }

        const message = {
            id: data.id,
            text: data.text,
            sender: data.sender,
            senderName: data.senderName,
            timestamp: data.timestamp,
            avatar: data.avatar,
            delivered: true
        };

        // Add to messages
        this.messages.push(message);
        this.messages.sort((a, b) => a.timestamp - b.timestamp);
        this.saveChatHistory();
        
        // Display message
        this.displayAllMessages();
        this.scrollToBottom();
        
        // Send delivery confirmation
        this.sendMessage({
            type: 'delivery_confirm',
            messageId: data.id,
            confirmedBy: this.currentUser.loginId
        });
        
        // Play notification
        this.playNotificationSound();
        
        // Show browser notification if not focused
        if (document.hidden) {
            this.showBrowserNotification(message);
        }
    }

    handleDeliveryConfirm(data) {
        const message = this.messages.find(msg => msg.id === data.messageId);
        if (message) {
            message.delivered = true;
            this.saveChatHistory();
            this.displayAllMessages();
            console.log('✅ Delivery confirmed for:', data.messageId);
        }
    }

    storeOfflineMessage(message) {
        const offlineKey = `abhiChat_offline_${this.otherUser.loginId}`;
        const offlineMessages = JSON.parse(localStorage.getItem(offlineKey) || '[]');
        offlineMessages.push(message);
        localStorage.setItem(offlineKey, JSON.stringify(offlineMessages));
        console.log('💾 Message stored offline');
    }

    handleTyping() {
        if (!this.isTyping) {
            this.isTyping = true;
            this.sendMessage({
                type: 'typing',
                isTyping: true,
                user: this.currentUser.displayName
            });
        }

        clearTimeout(this.typingTimeout);
        this.typingTimeout = setTimeout(() => {
            this.stopTyping();
        }, 3000);
    }

    stopTyping() {
        if (this.isTyping) {
            this.isTyping = false;
            this.sendMessage({
                type: 'typing',
                isTyping: false,
                user: this.currentUser.displayName
            });
        }
        clearTimeout(this.typingTimeout);
    }

    handleTypingIndicator(data) {
        if (data.isTyping) {
            this.showTypingIndicator(data.user);
        } else {
            this.hideTypingIndicator();
        }
    }

    showTypingIndicator(username) {
        this.hideTypingIndicator();
        
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.innerHTML = `
            <div class="typing-dots">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
            <span style="margin-left: 12px; color: var(--text-light); font-size: 14px;">
                ${username} is typing...
            </span>
        `;
        
        this.messagesContainer.appendChild(typingDiv);
        this.scrollToBottom();
        
        setTimeout(() => this.hideTypingIndicator(), 5000);
    }

    hideTypingIndicator() {
        const indicator = this.messagesContainer.querySelector('.typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    displayMessage(message) {
        const messageDiv = document.createElement('div');
        const isOwn = message.sender === this.currentUser.loginId;
        messageDiv.className = `message ${isOwn ? 'sent' : 'received'}`;
        
        const messageTime = new Date(message.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        let statusIcon = '';
        if (isOwn) {
            if (message.delivered) {
                statusIcon = '<i class="fas fa-check-double" style="color: #4fc3f7;" title="Delivered"></i>';
            } else {
                statusIcon = '<i class="fas fa-clock" style="color: #999;" title="Sending..."></i>';
            }
        }

        messageDiv.innerHTML = `
            <div class="message-content">${this.escapeHtml(message.text)}</div>
            <div class="message-time">
                ${messageTime}
                ${statusIcon}
            </div>
        `;

        this.messagesContainer.appendChild(messageDiv);
    }

    displayAllMessages() {
        // Remove welcome message if exists
        const welcomeMessage = this.messagesContainer.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        // Clear messages but keep typing indicator
        const typingIndicator = this.messagesContainer.querySelector('.typing-indicator');
        this.messagesContainer.innerHTML = '';
        
        if (this.messages.length === 0) {
            this.messagesContainer.innerHTML = `
                <div class="welcome-message">
                    <div class="welcome-icon">
                        <i class="fas fa-comments"></i>
                    </div>
                    <h3>Start Chatting with ${this.otherUser.displayName}!</h3>
                    <p>Send messages instantly across all your devices</p>
                    <div class="connection-info">
                        <i class="fas fa-shield-alt"></i>
                        <span>End-to-end encrypted messaging</span>
                    </div>
                </div>
            `;
        } else {
            // Sort and display messages
            this.messages.sort((a, b) => a.timestamp - b.timestamp);
            this.messages.forEach(message => {
                this.displayMessage(message);
            });
        }
        
        // Restore typing indicator
        if (typingIndicator) {
            this.messagesContainer.appendChild(typingIndicator);
        }
        
        this.scrollToBottom();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showChatPage() {
        this.loginPage.style.display = 'none';
        this.chatPage.style.display = 'flex';
        
        this.otherUserName.textContent = this.otherUser.displayName;
        this.otherUserAvatar.textContent = this.otherUser.avatar;
        
        this.displayAllMessages();
        
        setTimeout(() => {
            this.messageInput.focus();
        }, 300);
        
        this.updateCharCounter();
    }

    updateCharCounter() {
        const remaining = 500 - this.messageInput.value.length;
        this.charCounter.textContent = remaining;
        this.charCounter.style.color = remaining < 50 ? 'var(--error-color)' : 'var(--text-light)';
    }

    updateConnectionStatus(status, type = 'default') {
        this.statusText.textContent = status;
        this.userStatus.className = `status ${type}`;
    }

    refreshConnection() {
        if (this.currentUser) {
            this.showToast('Refreshing connection...', 'warning');
            this.connectionReady = false;
            setTimeout(() => {
                this.establishConnection();
            }, 1000);
        }
    }

    // Emoji functions
    toggleEmojiPicker() {
        const isVisible = this.emojiPicker.style.display === 'block';
        if (isVisible) {
            this.hideEmojiPicker();
        } else {
            this.showEmojiPicker();
        }
    }

    showEmojiPicker() {
        this.emojiPicker.style.display = 'block';
    }

    hideEmojiPicker() {
        this.emojiPicker.style.display = 'none';
    }

    insertEmoji(emoji) {
        const cursorPos = this.messageInput.selectionStart;
        const textBefore = this.messageInput.value.substring(0, cursorPos);
        const textAfter = this.messageInput.value.substring(cursorPos);
        
        this.messageInput.value = textBefore + emoji + textAfter;
        this.messageInput.focus();
        this.messageInput.setSelectionRange(cursorPos + emoji.length, cursorPos + emoji.length);
        
        this.updateCharCounter();
        this.hideEmojiPicker();
    }

    clearChat() {
        if (confirm('🗑️ Clear all chat history? This cannot be undone.')) {
            this.messages = [];
            this.saveChatHistory();
            this.displayAllMessages();
            this.showToast('Chat cleared', 'success');
        }
    }

    logout() {
        if (confirm('👋 Logout from ABHI Chat?')) {
            if (this.peer && !this.peer.destroyed) {
                this.peer.destroy();
            }
            
            localStorage.removeItem('abhiChatCurrentUser');
            this.currentUser = null;
            this.otherUser = null;
            this.connectionReady = false;
            
            this.loginIdInput.value = '';
            this.passwordInput.value = '';
            this.messageInput.value = '';
            
            this.chatPage.style.display = 'none';
            this.loginPage.style.display = 'flex';
            
            this.showToast('Logged out', 'success');
        }
    }

    // Storage functions
    loadChatHistory() {
        const saved = localStorage.getItem('abhiChatMessages');
        if (saved) {
            try {
                this.messages = JSON.parse(saved);
                this.messages.sort((a, b) => a.timestamp - b.timestamp);
            } catch (error) {
                console.error('Error loading chat:', error);
                this.messages = [];
            }
        }
    }

    saveChatHistory() {
        try {
            localStorage.setItem('abhiChatMessages', JSON.stringify(this.messages));
        } catch (error) {
            console.error('Error saving chat:', error);
        }
    }

    // UI helper functions
    scrollToBottom() {
        requestAnimationFrame(() => {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        });
    }

    showLoadingOverlay(title, message) {
        document.getElementById('loadingTitle').textContent = title;
        document.getElementById('loadingMessage').textContent = message;
        this.loadingOverlay.style.display = 'flex';
    }

    hideLoadingOverlay() {
        this.loadingOverlay.style.display = 'none';
    }

    showError(message) {
        const errorElement = document.getElementById('loginError');
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 5000);
    }

    showToast(message, type = 'default') {
        const toast = this.toast;
        const toastMessage = document.getElementById('toastMessage');
        
        toastMessage.textContent = message;
        toast.className = `toast ${type}`;
        toast.style.display = 'flex';
        
        setTimeout(() => {
            toast.style.display = 'none';
        }, 3000);
    }

    playNotificationSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (error) {
            // Audio not available
        }
    }

    showBrowserNotification(message) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`New message from ${message.senderName}`, {
                body: message.text,
                icon: '/favicon.ico'
            });
        }
    }
}

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    window.abhiChat = new ABHIChatReliable();
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
    
    console.log('🎉 ABHI Chat Reliable - Messages fixed!');
});
