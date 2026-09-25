// Global State
let allAppointments = [];
let allServices = [];
let allBarbers = [];
let allCustomers = [];
let allSettings = {};

document.addEventListener('DOMContentLoaded', async () => {
    lucide.createIcons();
    
    // Tab Switching Logic
    setupTabs();
    
    // Initial Load - load dashboard data which has everything
    await loadInitialData();

    // Event Listeners for Forms
    setupForms();
    setupFilters();
});

function setupTabs() {
    const tabLinks = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');

    // Handle hash change or click
    const switchTab = (hash) => {
        const targetId = hash.replace('#', '') || 'dashboard';
        
        tabContents.forEach(content => content.classList.add('hidden'));
        tabLinks.forEach(link => {
            link.classList.remove('bg-charcoal', 'text-white');
            link.classList.add('text-gray-400');
            const icon = link.querySelector('i');
            if(icon) icon.classList.remove('text-gold');
        });

        const targetSection = document.getElementById(`tab-${targetId}`);
        const activeLink = document.querySelector(`a[href="#${targetId}"]`);
        
        if (targetSection) targetSection.classList.remove('hidden');
        if (activeLink) {
            activeLink.classList.remove('text-gray-400');
            activeLink.classList.add('bg-charcoal', 'text-white');
            const icon = activeLink.querySelector('i');
            if(icon) icon.classList.add('text-gold');
            
            // Update Header Title
            document.getElementById('header-title').textContent = activeLink.textContent.trim();
        }
    }

    tabLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const hash = new URL(link.href).hash;
            switchTab(hash);
        });
    });

    // Initialize with current hash or dashboard
    switchTab(window.location.hash);
    window.addEventListener('hashchange', () => switchTab(window.location.hash));
}

async function loadInitialData() {
    try {
        const [aptData, srvData, brbData, custData, setData] = await Promise.all([
            API.request('GET', 'getAppointments'),
            API.getServices(),
            API.getBarbers(),
            API.request('GET', 'getCustomers'),
            API.getSettings()
        ]);

        allAppointments = aptData || [];
        allServices = srvData || [];
        allBarbers = brbData || [];
        allCustomers = custData || [];
        allSettings = setData || {};

        renderDashboard();
        renderAppointments();
        renderBarbers();
        renderServices();
        renderSettings();

    } catch (e) {
        console.error("Initial load failed:", e);
        // Show errors in sections
        ['stats-loading', 'appointments-loading', 'barbers-loading', 'services-loading', 'settings-loading'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.innerHTML = '<p class="text-red-500">Failed to load data.</p>';
        });
    }
}

// --- DASHBOARD ---
function renderDashboard() {
    calculateStats();
    renderTodayTable();

    document.getElementById('stats-loading').classList.add('hidden');
    document.getElementById('dashboard-content').classList.remove('hidden');
}

function calculateStats() {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const month = now.getMonth();
    const year = now.getFullYear();
    
    let todayCount = 0;
    let upcomingCount = 0;
    let completedCount = 0;
    let revenue = 0;

    const sevenDaysLater = new Date(now);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
    const sevenDaysStr = sevenDaysLater.toISOString().split('T')[0];

    allAppointments.forEach(apt => {
        const aptDate = new Date(apt.date);
        const aptMonth = aptDate.getMonth();
        const aptYear = aptDate.getFullYear();

        if (apt.status !== 'Cancelled') {
            if (apt.date === todayStr) todayCount++;
            
            if (apt.date > todayStr && apt.date <= sevenDaysStr) {
                upcomingCount++;
            }

            if (aptMonth === month && aptYear === year && apt.status === 'Confirmed') { 
                if (aptDate < now) {
                    completedCount++;
                    revenue += parseFloat(apt.price || 0);
                }
            }
        }
    });

    document.getElementById('stat-today').textContent = todayCount;
    document.getElementById('stat-upcoming').textContent = upcomingCount;
    document.getElementById('stat-completed').textContent = completedCount;
    document.getElementById('stat-revenue').textContent = Utils.formatCurrency(revenue);
}

function renderTodayTable() {
    const todayStr = new Date().toISOString().split('T')[0];
    
    const todayApts = allAppointments.filter(a => a.date === todayStr).sort((a,b) => {
        return a.start_time.localeCompare(b.start_time);
    });

    const tbody = document.getElementById('today-table-body');
    
    if (todayApts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-gray-500">No appointments today.</td></tr>';
        return;
    }

    tbody.innerHTML = todayApts.map(apt => {
        const srv = allServices.find(s => s.id === apt.service_id) || {name: 'Unknown'};
        const brb = allBarbers.find(b => b.id === apt.barber_id) || {name: 'Unknown'};
        const cust = allCustomers.find(c => c.id === apt.customer_id) || {name: 'Unknown'};
        
        const statusColor = apt.status === 'Cancelled' ? 'text-red-500' : 'text-green-500';

        return `
            <tr class="border-b border-charcoal hover:bg-[#151515] transition-colors">
                <td class="p-4 whitespace-nowrap">${Utils.formatTime(apt.start_time)}</td>
                <td class="p-4 whitespace-nowrap">${cust.name}</td>
                <td class="p-4 whitespace-nowrap text-gray-400">${srv.name}</td>
                <td class="p-4 whitespace-nowrap text-gray-400">${brb.name}</td>
                <td class="p-4 whitespace-nowrap font-medium ${statusColor}">${apt.status}</td>
            </tr>
        `;
    }).join('');
}


// --- APPOINTMENTS ---
function setupFilters() {
    document.getElementById('filter-date').addEventListener('change', renderAppointments);
    document.getElementById('filter-status').addEventListener('change', renderAppointments);
    
    document.getElementById('btn-clear-filters').addEventListener('click', () => {
        document.getElementById('filter-date').value = '';
        document.getElementById('filter-status').value = 'all';
        renderAppointments();
    });
}

function renderAppointments() {
    const dateFilter = document.getElementById('filter-date').value;
    const statusFilter = document.getElementById('filter-status').value;
    
    document.getElementById('appointments-loading').classList.add('hidden');
    document.getElementById('table-container').classList.remove('hidden');
    
    let filtered = allAppointments;

    if (dateFilter) {
        filtered = filtered.filter(a => a.date === dateFilter);
    }
    
    if (statusFilter !== 'all') {
        filtered = filtered.filter(a => a.status === statusFilter);
    }

    filtered.sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return b.start_time.localeCompare(a.start_time);
    });

    const tbody = document.getElementById('table-body');
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-gray-500">No appointments found matching filters.</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(apt => {
        const srv = allServices.find(s => s.id === apt.service_id) || {name: 'Unknown'};
        const brb = allBarbers.find(b => b.id === apt.barber_id) || {name: 'Unknown'};
        const cust = allCustomers.find(c => c.id === apt.customer_id) || {name: 'Unknown', email: '', phone: ''};
        
        const aptDate = new Date(apt.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        
        let statusBadge = '';
        if (apt.status === 'Confirmed') statusBadge = '<span class="bg-green-900/30 text-green-500 border border-green-900/50 px-2 py-1 rounded text-xs">Confirmed</span>';
        else if (apt.status === 'Cancelled') statusBadge = '<span class="bg-red-900/30 text-red-500 border border-red-900/50 px-2 py-1 rounded text-xs">Cancelled</span>';
        else statusBadge = `<span class="bg-gray-800 text-gray-400 px-2 py-1 rounded text-xs">${apt.status}</span>`;

        let actionBtns = '';
        if (apt.status !== 'Cancelled') {
            actionBtns = `<button onclick="cancelAppointment('${apt.id}')" class="text-xs text-red-500 hover:text-red-400 underline">Cancel</button>`;
        }

        return `
            <tr class="border-b border-charcoal hover:bg-[#151515] transition-colors">
                <td class="p-4 whitespace-nowrap text-gray-500 text-xs font-mono">${apt.id.substring(0,8)}</td>
                <td class="p-4 whitespace-nowrap">
                    <div class="font-medium">${aptDate}</div>
                    <div class="text-gray-400 text-xs">${Utils.formatTime(apt.start_time)} - ${Utils.formatTime(apt.end_time)}</div>
                </td>
                <td class="p-4">
                    <div class="font-medium">${cust.name}</div>
                    <div class="text-gray-500 text-xs">${cust.phone || ''}</div>
                </td>
                <td class="p-4">
                    <div class="font-medium text-gray-300">${srv.name}</div>
                    <div class="text-gray-500 text-xs">with ${brb.name}</div>
                </td>
                <td class="p-4 whitespace-nowrap">${statusBadge}</td>
                <td class="p-4 whitespace-nowrap">${actionBtns}</td>
            </tr>
        `;
    }).join('');
}

window.cancelAppointment = async (id) => {
    if(!confirm("Are you sure you want to cancel this appointment?")) return;
    try {
        await API.post('cancelAppointment', { id });
        Utils.showToast("Appointment cancelled");
        // Reload appointments
        const res = await API.request('GET', 'getAppointments');
        allAppointments = res || [];
        renderAppointments();
        renderDashboard();
    } catch(e) {
        Utils.showToast(e.message, 'error');
    }
};


// --- BARBERS ---
function renderBarbers() {
    document.getElementById('barbers-loading').classList.add('hidden');
    const grid = document.getElementById('barbers-grid-admin');
    grid.classList.remove('hidden');

    grid.innerHTML = allBarbers.map(barber => `
        <div class="bg-[#111111] border border-charcoal rounded-lg p-6 relative">
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h4 class="playfair text-xl font-bold">${barber.name}</h4>
                    <p class="text-xs text-gold uppercase tracking-wider">${barber.experience} | ${barber.specialty}</p>
                </div>
                <div class="flex gap-2">
                    <button onclick='editBarber(${JSON.stringify(barber).replace(/'/g, "&#39;")})' class="text-gray-400 hover:text-white"><i data-lucide="edit" class="w-4 h-4"></i></button>
                    <button onclick="deleteBarber('${barber.id}')" class="text-gray-400 hover:text-red-500"><i data-lucide="trash" class="w-4 h-4"></i></button>
                </div>
            </div>
            <div class="text-sm text-gray-400 mb-4 line-clamp-3">${barber.bio}</div>
            <div class="text-xs text-gray-500 border-t border-charcoal pt-4 flex justify-between">
                <span>${barber.phone}</span>
                <span>${barber.email}</span>
            </div>
        </div>
    `).join('');
    
    lucide.createIcons();
}

window.openBarberModal = () => {
    document.getElementById('barber-form').reset();
    document.getElementById('barber-id').value = '';
    document.getElementById('barber-modal-title').textContent = 'Add Barber';
    Utils.showModal('barber-modal');
};

window.closeBarberModal = () => {
    Utils.hideModal('barber-modal');
};

window.editBarber = (barber) => {
    document.getElementById('barber-id').value = barber.id;
    document.getElementById('barber-name').value = barber.name;
    document.getElementById('barber-spec').value = barber.specialty;
    document.getElementById('barber-exp').value = barber.experience;
    document.getElementById('barber-phone').value = barber.phone;
    document.getElementById('barber-email').value = barber.email;
    document.getElementById('barber-day-off').value = barber.weekly_day_off || '7';
    document.getElementById('barber-bio').value = barber.bio;
    document.getElementById('barber-modal-title').textContent = 'Edit Barber';
    Utils.showModal('barber-modal');
};

window.deleteBarber = async (id) => {
    if (!confirm('Are you sure you want to deactivate this barber?')) return;
    try {
        await API.post('deleteBarber', { id });
        Utils.showToast('Barber deactivated');
        allBarbers = await API.getBarbers();
        renderBarbers();
    } catch (e) {
        Utils.showToast(e.message, 'error');
    }
};


// --- SERVICES ---
function renderServices() {
    document.getElementById('services-loading').classList.add('hidden');
    const grid = document.getElementById('services-grid-admin');
    grid.classList.remove('hidden');

    grid.innerHTML = allServices.map(srv => `
        <div class="bg-[#111111] border border-charcoal rounded-lg p-6 relative">
            <div class="flex justify-between items-start mb-2">
                <h4 class="playfair text-xl font-bold">${srv.name}</h4>
                <div class="flex gap-2">
                    <button onclick='editService(${JSON.stringify(srv).replace(/'/g, "&#39;")})' class="text-gray-400 hover:text-white"><i data-lucide="edit" class="w-4 h-4"></i></button>
                    <button onclick="deleteService('${srv.id}')" class="text-gray-400 hover:text-red-500"><i data-lucide="trash" class="w-4 h-4"></i></button>
                </div>
            </div>
            <span class="text-xs bg-charcoal border border-gray-800 px-2 py-1 rounded mb-4 inline-block">${srv.category}</span>
            <p class="text-gray-400 text-sm mb-4">${srv.description}</p>
            <div class="flex justify-between items-center pt-4 border-t border-charcoal">
                <span class="text-gold font-bold">${Utils.formatCurrency(srv.price)}</span>
                <span class="text-xs text-gray-500">${srv.duration_minutes} min</span>
            </div>
        </div>
    `).join('');
    
    lucide.createIcons();
}

window.openServiceModal = () => {
    document.getElementById('service-form').reset();
    document.getElementById('srv-id').value = '';
    document.getElementById('service-modal-title').textContent = 'Add Service';
    Utils.showModal('service-modal');
};

window.closeServiceModal = () => {
    Utils.hideModal('service-modal');
};

window.editService = (srv) => {
    document.getElementById('srv-id').value = srv.id;
    document.getElementById('srv-name').value = srv.name;
    document.getElementById('srv-desc').value = srv.description;
    document.getElementById('srv-price').value = srv.price;
    document.getElementById('srv-duration').value = srv.duration_minutes;
    document.getElementById('srv-cat').value = srv.category;
    document.getElementById('service-modal-title').textContent = 'Edit Service';
    Utils.showModal('service-modal');
};

window.deleteService = async (id) => {
    if (!confirm('Are you sure you want to deactivate this service?')) return;
    try {
        await API.post('deleteService', { id });
        Utils.showToast('Service deactivated');
        allServices = await API.getServices();
        renderServices();
    } catch (e) {
        Utils.showToast(e.message, 'error');
    }
};


// --- SETTINGS ---
function renderSettings() {
    const keys = ['business_name', 'address', 'phone', 'email', 'booking_interval', 'cancellation_hours', 'timezone', 'currency'];
    keys.forEach(key => {
        if(allSettings[key] !== undefined && document.getElementById(key)) {
            document.getElementById(key).value = allSettings[key];
        }
    });

    document.getElementById('settings-loading').classList.add('hidden');
    document.getElementById('settings-form').classList.remove('hidden');
}

// --- FORM SUBMISSIONS ---
function setupForms() {
    // Barber Form
    document.getElementById('barber-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'SAVING...';

        const id = document.getElementById('barber-id').value;
        const payload = {
            id: id || undefined,
            name: document.getElementById('barber-name').value,
            specialty: document.getElementById('barber-spec').value,
            experience: document.getElementById('barber-exp').value,
            phone: document.getElementById('barber-phone').value,
            email: document.getElementById('barber-email').value,
            weekly_day_off: document.getElementById('barber-day-off').value,
            bio: document.getElementById('barber-bio').value
        };

        try {
            if (id) {
                await API.post('updateBarber', payload);
                Utils.showToast('Barber updated');
            } else {
                await API.post('createBarber', payload);
                Utils.showToast('Barber created');
            }
            closeBarberModal();
            allBarbers = await API.getBarbers();
            renderBarbers();
        } catch (error) {
            Utils.showToast(error.message, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Save Barber';
        }
    });

    // Service Form
    document.getElementById('service-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'SAVING...';

        const id = document.getElementById('srv-id').value;
        const payload = {
            id: id || undefined,
            name: document.getElementById('srv-name').value,
            description: document.getElementById('srv-desc').value,
            price: parseFloat(document.getElementById('srv-price').value),
            duration_minutes: parseInt(document.getElementById('srv-duration').value, 10),
            category: document.getElementById('srv-cat').value
        };

        try {
            if (id) {
                await API.post('updateService', payload);
                Utils.showToast('Service updated');
            } else {
                await API.post('createService', payload);
                Utils.showToast('Service created');
            }
            closeServiceModal();
            allServices = await API.getServices();
            renderServices();
        } catch (error) {
            Utils.showToast(error.message, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Save Service';
        }
    });

    // Settings Form
    document.getElementById('settings-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btn = document.getElementById('btn-save-settings');
        btn.disabled = true;
        btn.textContent = 'SAVING...';

        const keys = ['business_name', 'address', 'phone', 'email', 'booking_interval', 'cancellation_hours', 'timezone', 'currency'];
        const payload = {};
        
        keys.forEach(key => {
            payload[key] = document.getElementById(key).value;
        });

        try {
            await API.post('updateSettings', payload);
            Utils.showToast('Settings saved successfully');
            allSettings = payload; // local update
        } catch (error) {
            Utils.showToast(error.message, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Save Settings';
        }
    });

    // Password Form
    const pwdForm = document.getElementById('password-form');
    if (pwdForm) {
        pwdForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const btn = document.getElementById('btn-change-password');
            btn.disabled = true;
            btn.textContent = 'UPDATING...';

            const current_password = document.getElementById('current_password').value;
            const new_password = document.getElementById('new_password').value;
            const confirm_password = document.getElementById('confirm_password').value;

            if (new_password !== confirm_password) {
                Utils.showToast('New passwords do not match', 'error');
                btn.disabled = false;
                btn.textContent = 'Update';
                return;
            }

            try {
                // Get admin user from session
                const adminStr = sessionStorage.getItem('admin_user');
                const adminUser = adminStr ? JSON.parse(adminStr) : null;
                const adminId = adminUser ? adminUser.id : '';

                await API.post('changePassword', { 
                    id: adminId, 
                    current_password, 
                    new_password 
                });
                Utils.showToast('Password updated successfully');
                pwdForm.reset();
                closePasswordModal();
            } catch (error) {
                Utils.showToast(error.message, 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Update';
            }
        });
    }
}
