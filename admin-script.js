// Check if user is logged in as admin
if (!sessionStorage.getItem('userType') || sessionStorage.getItem('userType') !== 'admin') {
    window.location.href = '/';
}

// Display user email
document.getElementById('userEmailDisplay').textContent = `Logged in as: ${sessionStorage.getItem('userEmail')}`;

// Load pending items
async function loadPendingItems() {
    try {
        const response = await fetch('/api/items/pending');
        const items = await response.json();
        
        const itemsGrid = document.getElementById('pendingItems');
        itemsGrid.innerHTML = '';
        
        items.forEach(item => {
            const itemCard = document.createElement('div');
            itemCard.className = 'item-card';
            const typeClass = item.type === 'lost' ? 'lost-text' : 'found-text';
            itemCard.innerHTML = `
                <img src="${item.image_path}" alt="${item.title}">
                <h3>${item.title}</h3>
                <p>${item.description}</p>
                <p class="item-details">
                    <span class="${typeClass}" >Type: ${item.type}</span> | 
                    Category: ${item.category}
                </p>
                <p class="user-info">Posted by: ${item.user_email}</p>
                <div class="action-buttons">
                    <button class="login-btn approve-btn" onclick="approveItem(${item.id})">Approve</button>
                    <button class="login-btn reject-btn" onclick="rejectItem(${item.id})">Reject</button>
                </div>
            `;
            itemsGrid.appendChild(itemCard);
        });
    } catch (error) {
        console.error('Error loading pending items:', error);
        alert('Error loading pending items');
    }
}

// Load approved items
async function loadApprovedItems() {
    try {
        const response = await fetch('/api/items/approved');
        const items = await response.json();
        
        const itemsGrid = document.getElementById('approvedItems');
        itemsGrid.innerHTML = '';
        
        items.forEach(item => {
            const itemCard = document.createElement('div');
            itemCard.className = 'item-card';
            const typeClass = item.type === 'lost' ? 'lost-text' : 'found-text';
            itemCard.innerHTML = `
                <img src="${item.image_path}" alt="${item.title}">
                <h3>${item.title}</h3>
                <p>${item.description}</p>
                <p class="item-details">
                    <span class="${typeClass}">Type: ${item.type}</span> | 
                    Category: ${item.category}
                </p>
                <p class="user-info">Posted by: ${item.user_email}</p>
                <div class="action-buttons">
                    <button class="login-btn delete-btn" onclick="deleteItem(${item.id})">Delete</button>
                </div>
            `;
            itemsGrid.appendChild(itemCard);
        });
    } catch (error) {
        console.error('Error loading approved items:', error);
        alert('Error loading approved items');
    }
}

// Approve item
async function approveItem(itemId) {
    try {
        const response = await fetch(`/api/items/${itemId}/approve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        
        if (response.ok) {
            alert('Item approved successfully');
            loadPendingItems();
            loadApprovedItems();
        } else {
            alert(data.error || 'Error approving item');
        }
    } catch (error) {
        console.error('Error approving item:', error);
        alert('Error approving item. Please try again.');
    }
}

// Reject item
async function rejectItem(itemId) {
    try {
        const response = await fetch(`/api/items/${itemId}/reject`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        
        if (response.ok) {
            alert('Item rejected successfully');
            loadPendingItems();
        } else {
            alert(data.error || 'Error rejecting item');
        }
    } catch (error) {
        console.error('Error rejecting item:', error);
        alert('Error rejecting item. Please try again.');
    }
}

// Delete item
async function deleteItem(itemId) {
    if (!confirm('Are you sure you want to delete this item?')) {
        return;
    }

    try {
        const response = await fetch(`/api/items/${itemId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'user-type': 'admin'
            }
        });
        const data = await response.json();
        
        if (response.ok) {
            alert('Item deleted successfully');
            // Refresh both sections
            loadPendingItems();
            loadApprovedItems();
        } else {
            alert(data.error || 'Error deleting item');
        }
    } catch (error) {
        console.error('Error deleting item:', error);
        alert('Error deleting item');
    }
}

// Load items when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadPendingItems();
    loadApprovedItems();
});

// Chat functionality
let chatInterval;
let selectedUser = null;

function toggleChat() {
    const modal = document.getElementById('chatModal');
    if (modal.style.display === 'block') {
        modal.style.display = 'none';
        clearInterval(chatInterval);
    } else {
        modal.style.display = 'block';
        loadChatUsers();
        chatInterval = setInterval(() => {
            if (selectedUser) {
                loadMessages();
            }
        }, 2000);
    }
}

async function loadChatUsers() {
    try {
        const userEmail = sessionStorage.getItem('userEmail');
        const response = await fetch(`/api/chat-users/${userEmail}?user_type=admin`);
        const users = await response.json();
        
        const chatUsers = document.getElementById('chatUsers');
        chatUsers.innerHTML = '';
        
        users.forEach(user => {
            const userDiv = document.createElement('div');
            userDiv.className = 'chat-user';
            userDiv.textContent = user.email;
            userDiv.onclick = () => selectUser(user.email);
            chatUsers.appendChild(userDiv);
        });
    } catch (error) {
        console.error('Error loading chat users:', error);
    }
}

function selectUser(email) {
    selectedUser = email;
    const users = document.querySelectorAll('.chat-user');
    users.forEach(user => {
        user.classList.remove('active');
        if (user.textContent === email) {
            user.classList.add('active');
        }
    });
    loadMessages();
}

async function loadMessages() {
    if (!selectedUser) return;
    
    try {
        const userEmail = sessionStorage.getItem('userEmail');
        const response = await fetch(`/api/messages/${userEmail}?other_user=${selectedUser}`);
        const messages = await response.json();
        
        const chatMessages = document.getElementById('chatMessages');
        chatMessages.innerHTML = '';
        
        messages.forEach(msg => {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${msg.sender_email === userEmail ? 'sent' : 'received'}`;
            messageDiv.textContent = msg.message;
            chatMessages.appendChild(messageDiv);
        });
        
        chatMessages.scrollTop = chatMessages.scrollHeight;
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

async function sendMessage() {
    if (!selectedUser) {
        alert('Please select a user to chat with');
        return;
    }
    
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    
    if (!message) return;
    
    try {
        const userEmail = sessionStorage.getItem('userEmail');
        const response = await fetch('/api/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sender_email: userEmail,
                receiver_email: selectedUser,
                message: message
            })
        });
        
        if (response.ok) {
            messageInput.value = '';
            loadMessages();
        } else {
            alert('Error sending message');
        }
    } catch (error) {
        console.error('Error sending message:', error);
        alert('Error sending message');
    }
}

// Add event listener for Enter key in message input
document.getElementById('messageInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
}); 