document.addEventListener('DOMContentLoaded', () => {
    // Check if already logged in on login page
    if (window.location.pathname.includes('login.html')) {
        if (sessionStorage.getItem('admin_token')) {
            window.location.href = 'index.html';
        }
    } else {
        // Protect other pages
        if (!sessionStorage.getItem('admin_token')) {
            window.location.href = 'login.html';
        }
    }

    const form = document.getElementById('login-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-login');
            btn.disabled = true;
            btn.textContent = 'VERIFYING...';
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                const res = await API.post('adminLogin', { email, password });
                if (res.token) {
                    sessionStorage.setItem('admin_token', res.token);
                    sessionStorage.setItem('admin_user', JSON.stringify(res.admin));
                    window.location.href = 'index.html';
                }
            } catch (error) {
                Utils.showToast(error.message || 'Login failed', 'error');
                btn.disabled = false;
                btn.textContent = 'LOGIN';
            }
        });
    }

    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            sessionStorage.removeItem('admin_token');
            sessionStorage.removeItem('admin_user');
            window.location.href = 'login.html';
        });
    }

    const togglePasswordBtn = document.getElementById('toggle-password');
    const passwordInput = document.getElementById('password');
    const eyeIcon = document.getElementById('eye-icon');
    
    if (togglePasswordBtn && passwordInput && eyeIcon) {
        togglePasswordBtn.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            if (type === 'password') {
                eyeIcon.setAttribute('data-lucide', 'eye');
            } else {
                eyeIcon.setAttribute('data-lucide', 'eye-off');
            }
            lucide.createIcons(); // Re-render icon
        });
    }
});
