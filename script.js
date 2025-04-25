function showLoginForm(type) {
    document.getElementById('adminLoginForm').classList.add('hidden');
    document.getElementById('studentLoginForm').classList.add('hidden');
    document.getElementById(`${type}LoginForm`).classList.remove('hidden');
}

async function login(type) {
    const email = document.getElementById(`${type}Email`).value;
    const password = document.getElementById(`${type}Password`).value;

    if (!email || !password) {
        alert('Please enter both email and password');
        return;
    }

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password, type })
        });

        const data = await response.json();
        
        if (data.success) {
            // Store user type and email in sessionStorage
            sessionStorage.setItem('userType', type);
            sessionStorage.setItem('userEmail', email);
            
            // Redirect based on user type
            if (type === 'admin') {
                window.location.href = '/admin-dashboard.html';
            } else {
                window.location.href = '/student-dashboard.html';
            }
        } else {
            alert(data.message || 'Login failed. Please try again.');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('An error occurred during login. Please try again.');
    }
} 