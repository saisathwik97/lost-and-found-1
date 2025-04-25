// Login credentials
const adminCredentials = {
    email: 'admin@gmail.com',
    password: 'admin123'
};

const studentCredentials = [
    {
        email: '23241a05j0@gmail.com',
        password: '23241a05j0'
    },
    {
        email: '23241a05h7@gmail.com',
        password: '23241a05h7'
    }, 
    {
        email: '23241a05g9@gmail.com',
        password: '23241a05g9'
    },
    
    
];

// DOM Elements
const adminLoginBtn = document.getElementById('adminLoginBtn');
const studentLoginBtn = document.getElementById('studentLoginBtn');
const adminLoginForm = document.getElementById('adminLoginForm');
const studentLoginForm = document.getElementById('studentLoginForm');
const adminForm = document.getElementById('adminForm');
const studentForm = document.getElementById('studentForm');

// Event Listeners
adminLoginBtn.addEventListener('click', () => {
    adminLoginForm.classList.remove('hidden');
    studentLoginForm.classList.add('hidden');
});

studentLoginBtn.addEventListener('click', () => {
    studentLoginForm.classList.remove('hidden');
    adminLoginForm.classList.add('hidden');
});

adminForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;

    if (email === adminCredentials.email && password === adminCredentials.password) {
        showAdminDashboard();
    } else {
        alert('Invalid admin credentials');
    }
});

studentForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('studentEmail').value;
    const password = document.getElementById('studentPassword').value;

    const student = studentCredentials.find(cred => 
        cred.email === email && cred.password === password
    );

    if (student) {
        showStudentDashboard(email);
    } else {
        alert('Invalid student credentials');
    }
});

function showAdminDashboard() {
    document.querySelector('.container').innerHTML = `
        <h1>Admin Dashboard</h1>
        <div class="dashboard" id="adminDashboard">
            <h2>Pending Items</h2>
            <div id="pendingItems" class="items-grid"></div>
            <h2>Approved Items</h2>
            <div id="approvedItems" class="items-grid"></div>
            <button onclick="logout()" class="login-btn" style="margin-top: 20px;">Logout</button>
        </div>
    `;
    loadItems('pending');
    loadItems('approved');
}

function showStudentDashboard(email) {
    document.querySelector('.container').innerHTML = `
        <h1>Student Dashboard</h1>
        <div class="dashboard" id="studentDashboard">
            <div class="post-form">
                <h2>Post Lost/Found Item</h2>
                <form id="itemForm">
                    <input type="text" id="itemTitle" placeholder="Title" required>
                    <textarea id="itemDescription" placeholder="Description" required></textarea>
                    <input type="file" id="itemImage" accept="image/*" required>
                    <select id="itemType" required>
                        <option value="">Select Type</option>
                        <option value="lost">Lost Item</option>
                        <option value="found">Found Item</option>
                    </select>
                    <button type="submit" class="login-btn">Post Item</button>
                </form>
            </div>
            <h2>Lost and Found Items</h2>
            <div id="itemsGrid" class="items-grid"></div>
            <button onclick="logout()" class="login-btn" style="margin-top: 20px;">Logout</button>
        </div>
    `;

    const itemForm = document.getElementById('itemForm');
    itemForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('itemTitle').value;
        const description = document.getElementById('itemDescription').value;
        const type = document.getElementById('itemType').value;
        const image = document.getElementById('itemImage').files[0];

        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('type', type);
        formData.append('image', image);
        formData.append('userEmail', email);

        try {
            const response = await fetch('/api/items', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to post item');
            }

            const data = await response.json();
            alert('Item posted successfully! Waiting for admin approval.');
            itemForm.reset();
            loadItems('approved');
        } catch (error) {
            console.error('Error:', error);
            alert('Error posting item');
        }
    });

    loadItems('approved');
}

async function loadItems(status = 'approved') {
    try {
        const response = await fetch(`/api/items${status === 'pending' ? '/pending' : ''}`);
        if (!response.ok) {
            throw new Error('Failed to fetch items');
        }

        const items = await response.json();
        const container = status === 'pending' ? 
            document.getElementById('pendingItems') : 
            document.getElementById('itemsGrid') || document.getElementById('approvedItems');

        if (container) {
            container.innerHTML = items.map(item => `
                <div class="item-card">
                    <img src="${item.image_path}" alt="${item.title}" onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
                    <h3>${item.title}</h3>
                    <p>${item.description}</p>
                    <p class="user-info">Posted by: ${item.user_email}</p>
                    <p>Type: ${item.type}</p>
                    ${status === 'pending' && document.getElementById('adminDashboard') ? `
                        <div class="action-buttons">
                            <button onclick="approveItem(${item.id})" class="approve-btn">Approve</button>
                            <button onclick="rejectItem(${item.id})" class="reject-btn">Reject</button>
                        </div>
                    ` : ''}
                </div>
            `).join('') || '<p>No items found</p>';
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error loading items');
    }
}

async function approveItem(itemId) {
    try {
        const response = await fetch(`/api/items/${itemId}/approve`, {
            method: 'POST'
        });

        if (!response.ok) {
            throw new Error('Failed to approve item');
        }

        loadItems('pending');
        loadItems('approved');
    } catch (error) {
        console.error('Error:', error);
        alert('Error approving item');
    }
}

async function rejectItem(itemId) {
    try {
        const response = await fetch(`/api/items/${itemId}/reject`, {
            method: 'POST'
        });

        if (!response.ok) {
            throw new Error('Failed to reject item');
        }

        loadItems('pending');
    } catch (error) {
        console.error('Error:', error);
        alert('Error rejecting item');
    }
}

function logout() {
    location.reload();
} 