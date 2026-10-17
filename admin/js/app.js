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
    setupSidebar();
    
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
        const initData = await API.request('GET', 'getAdminInitData');

        allAppointments = initData.appointments || [];
        allServices = initData.services || [];
        allBarbers = initData.barbers || [];
        allCustomers = initData.customers || [];
        allSettings = initData.settings || {};

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
    const todayStr = getTodayStr();
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    
    let todayCount = 0;
    let upcomingCount = 0;
    let completedCount = 0;
    let revenue = 0;

    const sevenDaysLaterStr = addDays(todayStr, 7);

    allAppointments.forEach(apt => {
        const aptDateStr = normalizeDateStr(apt.date, apt.booking_reference);
        const aptParts = aptDateStr ? aptDateStr.split('-').map(Number) : [];
        const aptDate = aptParts.length === 3 ? new Date(aptParts[0], aptParts[1] - 1, aptParts[2]) : new Date(apt.date);
        const aptMonth = aptDate.getMonth();
        const aptYear = aptDate.getFullYear();

        if (apt.status !== 'Cancelled') {
            if (aptDateStr === todayStr) todayCount++;
            
            if (aptDateStr > todayStr && aptDateStr <= sevenDaysLaterStr) {
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
    const todayStr = getTodayStr();
    
    const todayApts = allAppointments.filter(a => normalizeDateStr(a.date, a.booking_reference) === todayStr).sort((a,b) => {
        return (parseTimeToMinutes(a.start_time) || 0) - (parseTimeToMinutes(b.start_time) || 0);
    });

    const tbody = document.getElementById('today-table-body');
    if (!tbody) return;
    
    if (todayApts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-gray-500">No appointments today.</td></tr>';
        return;
    }

    tbody.innerHTML = todayApts.map(apt => {
        const srv = allServices.find(s => s.id === apt.service_id) || {name: apt.service_name || 'Unknown'};
        const brb = allBarbers.find(b => b.id === apt.barber_id) || {name: apt.barber_name || 'Barber'};
        const cust = allCustomers.find(c => c.id === apt.customer_id) || {name: apt.customer_name || 'Customer'};

        return `
            <tr class="border-b border-[rgba(255,255,255,0.04)] hover:bg-[#181a24] transition-colors">
                <td class="p-4 whitespace-nowrap font-medium text-gold">${Utils.formatTime(apt.start_time)}</td>
                <td class="p-4 whitespace-nowrap text-white font-medium">${cust.name}</td>
                <td class="p-4 whitespace-nowrap text-gray-400">${srv.name}</td>
                <td class="p-4 whitespace-nowrap text-gray-400">${brb.name}</td>
                <td class="p-4 whitespace-nowrap"><span class="neu-pill-inset ${apt.status === 'Cancelled' ? 'text-red-400' : 'text-green-400'} font-medium px-2.5 py-1 text-xs">${apt.status}</span></td>
            </tr>
        `;
    }).join('');
}


// --- APPOINTMENTS & BARBERS TIMELINE ---
function getTodayStr() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function addDays(dateStr, days) {
    if (!dateStr) return getTodayStr();
    const parts = dateStr.split('-').map(Number);
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    date.setDate(date.getDate() + days);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

let currentTimelineDate = getTodayStr();
let currentViewMode = 'timeline'; // 'timeline' or 'table'
let currentActiveApt = null;

let timelineConfig = {
    startHour: 9,
    endHour: 18,
    hourWidth: 155, // pixels per hour
    showTurnover: false,
    demoMode: false // false by default so real appointments are always displayed!
};

const DEFAULT_BARBERS = [
    {
        id: 'barber_1',
        barberNumber: '01',
        name: 'John Carter',
        specialty: 'Classic cuts • Fades',
        icon: 'scissors'
    },
    {
        id: 'barber_2',
        barberNumber: '02',
        name: 'Michael Davis',
        specialty: 'Modern styling',
        icon: 'scissors'
    },
    {
        id: 'barber_3',
        barberNumber: '03',
        name: 'David Wilson',
        specialty: 'Fades • Hot Towel',
        icon: 'scissors'
    },
    {
        id: 'barber_4',
        barberNumber: '04',
        name: 'Marcus Sterling',
        specialty: 'Beard Sculpting & Trim',
        icon: 'scissors'
    },
    {
        id: 'barber_5',
        barberNumber: '05',
        name: 'Julian Thorne',
        specialty: 'Scalp & Hair Treatment',
        icon: 'scissors'
    }
];

// Reference Demo Appointments for Barber chairs
const SCREENSHOT_DEMO_APTS = [
    {
        id: 'demo_1',
        booking_reference: 'BS-9382-CL',
        barber_id: 'barber_1',
        customer_name: 'Claire D. · Tl...',
        phone: '+1 (555) 234-5678',
        email: 'claire.d@example.com',
        service_name: 'Classic Fade & Beard',
        service_id: 'srv_1',
        price: 45,
        status: 'Active Protocol',
        start_time: '09:30',
        end_time: '10:45',
        customer_notes: 'Prefers classic razor finish.'
    },
    {
        id: 'demo_2',
        booking_reference: 'BS-4819-EL',
        barber_id: 'barber_1',
        customer_name: 'Eleanor Van...',
        phone: '+1 (555) 345-6789',
        email: 'eleanor.v@example.com',
        service_name: 'Precision Scissor Cut',
        service_id: 'srv_2',
        price: 35,
        status: 'Arrived Lounge',
        start_time: '11:15',
        end_time: '12:00',
        customer_notes: 'Waiting in lounge.'
    },
    {
        id: 'demo_3',
        booking_reference: 'BS-1102-GE',
        barber_id: 'barber_1',
        customer_name: 'Genevieve ...',
        phone: '+1 (555) 456-7890',
        email: 'genevieve@example.com',
        service_name: 'Executive Grooming',
        service_id: 'srv_3',
        price: 55,
        status: 'Confirmed',
        start_time: '14:00',
        end_time: '14:45',
        customer_notes: 'Confirmed appointment.'
    },
    {
        id: 'demo_4',
        booking_reference: 'BS-6201-MA',
        barber_id: 'barber_2',
        customer_name: 'Marcus Sterli...',
        phone: '+1 (555) 567-8901',
        email: 'marcus.s@example.com',
        service_name: 'Modern Styling & Beard',
        service_id: 'srv_4',
        price: 50,
        status: 'Active Protocol',
        start_time: '10:00',
        end_time: '11:15',
        customer_notes: 'Hot lather and razor lining.'
    },
    {
        id: 'demo_5',
        booking_reference: 'BS-7740-AR',
        barber_id: 'barber_2',
        customer_name: 'Aria Mo...',
        phone: '+1 (555) 678-9012',
        email: 'aria.m@example.com',
        service_name: 'Hot Towel Shave',
        service_id: 'srv_2',
        price: 30,
        status: 'Confirmed',
        start_time: '12:00',
        end_time: '12:45',
        customer_notes: ''
    },
    {
        id: 'demo_turnover_2',
        is_turnover: true,
        barber_id: 'barber_2',
        start_time: '13:00',
        end_time: '13:30',
        label: 'Station Turnover'
    },
    {
        id: 'demo_6',
        booking_reference: 'BS-3392-SO',
        barber_id: 'barber_3',
        customer_name: 'Sophia Chen',
        phone: '+1 (555) 789-0123',
        email: 'sophia.c@example.com',
        service_name: 'Fades & Hot Towel',
        service_id: 'srv_3',
        price: 45,
        status: 'Active Protocol',
        start_time: '10:15',
        end_time: '11:30',
        customer_notes: 'Low skin fade.'
    },
    {
        id: 'demo_7',
        booking_reference: 'BS-9904-VI',
        barber_id: 'barber_3',
        customer_name: 'Victoria Be...',
        phone: '+1 (555) 890-1234',
        email: 'victoria.b@example.com',
        service_name: 'Beard Sculpting',
        service_id: 'srv_1',
        price: 35,
        status: 'Confirmed',
        start_time: '12:30',
        end_time: '13:15',
        customer_notes: ''
    },
    {
        id: 'demo_8',
        booking_reference: 'BS-2041-LI',
        barber_id: 'barber_4',
        customer_name: 'Lillian R...',
        phone: '+1 (555) 901-2345',
        email: 'lillian.r@example.com',
        service_name: 'Classic Haircut',
        service_id: 'srv_5',
        price: 30,
        status: 'Completed',
        start_time: '09:00',
        end_time: '09:45',
        customer_notes: ''
    },
    {
        id: 'demo_9',
        booking_reference: 'BS-5812-CH',
        barber_id: 'barber_4',
        customer_name: 'Charlotte Du...',
        phone: '+1 (555) 012-3456',
        email: 'charlotte.d@example.com',
        service_name: 'Beard Trim & Shape',
        service_id: 'srv_5',
        price: 25,
        status: 'Starting Soon',
        start_time: '11:00',
        end_time: '11:45',
        customer_notes: ''
    },
    {
        id: 'demo_10',
        booking_reference: 'BS-4401-IS',
        barber_id: 'barber_4',
        customer_name: 'Isabelle...',
        phone: '+1 (555) 123-7890',
        email: 'isabelle@example.com',
        service_name: 'Haircut & Wash',
        service_id: 'srv_5',
        price: 35,
        status: 'Confirmed',
        start_time: '13:00',
        end_time: '13:45',
        customer_notes: ''
    },
    {
        id: 'demo_11',
        booking_reference: 'BS-8012-VI',
        barber_id: 'barber_5',
        customer_name: 'VIP Member S...',
        phone: '+1 (555) 999-8877',
        email: 'vip.member@example.com',
        service_name: 'Signature Grooming',
        service_id: 'srv_1',
        price: 65,
        status: 'Room Prepped',
        start_time: '10:45',
        end_time: '11:30',
        customer_notes: 'Private chair appointment.'
    }
];

function parseTimeToMinutes(timeVal) {
    if (!timeVal) return null;
    let str = String(timeVal).trim();
    if (str.includes('T')) {
        const d = new Date(str);
        if (!isNaN(d.getTime())) {
            return d.getHours() * 60 + d.getMinutes();
        }
    }
    const parts = str.split(':');
    if (parts.length >= 2) {
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (!isNaN(h) && !isNaN(m)) return h * 60 + m;
    }
    return null;
}

function normalizeTime24(timeVal) {
    const mins = parseTimeToMinutes(timeVal);
    if (mins === null) return '';
    const h = Math.floor(mins / 60).toString().padStart(2, '0');
    const m = (mins % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
}

function normalizeDateStr(dateVal, bookingRef = '') {
    // 1. Check booking reference format BS-YYYYMMDD-XXXX (most authoritative!)
    if (bookingRef && /^BS-(\d{4})(\d{2})(\d{2})-/i.test(bookingRef)) {
        const match = bookingRef.match(/^BS-(\d{4})(\d{2})(\d{2})-/i);
        if (match) return `${match[1]}-${match[2]}-${match[3]}`;
    }
    if (!dateVal) return '';
    if (dateVal instanceof Date) {
        const y = dateVal.getFullYear();
        const m = String(dateVal.getMonth() + 1).padStart(2, '0');
        const d = String(dateVal.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    let str = String(dateVal).trim();
    if (str.includes('T')) {
        const d = new Date(str);
        if (!isNaN(d.getTime())) {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        }
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    return str;
}

function setupFilters() {
    // Date filter & navigation
    const dateInput = document.getElementById('filter-date');
    if (dateInput) {
        dateInput.value = currentTimelineDate;
        dateInput.addEventListener('change', (e) => {
            if (e.target.value) {
                currentTimelineDate = e.target.value;
                renderAppointments();
            }
        });
    }

    const prevBtn = document.getElementById('btn-date-prev');
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            currentTimelineDate = addDays(currentTimelineDate, -1);
            renderAppointments();
        });
    }

    const nextBtn = document.getElementById('btn-date-next');
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            currentTimelineDate = addDays(currentTimelineDate, 1);
            renderAppointments();
        });
    }

    const todayBtn = document.getElementById('btn-date-today');
    if (todayBtn) {
        todayBtn.addEventListener('click', () => {
            currentTimelineDate = getTodayStr();
            renderAppointments();
        });
    }

    // Status filter
    const statusSelect = document.getElementById('filter-status');
    if (statusSelect) {
        statusSelect.addEventListener('change', renderAppointments);
    }

    const clearBtn = document.getElementById('btn-clear-filters');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            currentTimelineDate = getTodayStr();
            if (statusSelect) statusSelect.value = 'all';
            timelineConfig.demoMode = false;
            renderAppointments();
        });
    }

    // View switcher (Timeline vs Table)
    const timelineBtn = document.getElementById('btn-view-timeline');
    const tableBtn = document.getElementById('btn-view-table');

    if (timelineBtn && tableBtn) {
        timelineBtn.addEventListener('click', () => setViewMode('timeline'));
        tableBtn.addEventListener('click', () => setViewMode('table'));
    }

    // Configure view parameters button
    const cfgBtn = document.getElementById('btn-configure-view-bottom');
    if (cfgBtn) {
        cfgBtn.addEventListener('click', openViewParamsModal);
    }
}

function setViewMode(mode) {
    currentViewMode = mode;
    const timelineBtn = document.getElementById('btn-view-timeline');
    const tableBtn = document.getElementById('btn-view-table');
    const timelineContainer = document.getElementById('timeline-view-container');
    const tableContainer = document.getElementById('table-view-container');

    if (mode === 'timeline') {
        timelineBtn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#C9A227] text-black shadow-sm flex items-center gap-1.5 transition-all';
        tableBtn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-400 hover:text-white flex items-center gap-1.5 transition-all';
        timelineContainer.classList.remove('hidden');
        tableContainer.classList.add('hidden');
    } else {
        tableBtn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#C9A227] text-black shadow-sm flex items-center gap-1.5 transition-all';
        timelineBtn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-400 hover:text-white flex items-center gap-1.5 transition-all';
        tableContainer.classList.remove('hidden');
        timelineContainer.classList.add('hidden');
    }
}

function getActiveBarbers() {
    if (allBarbers && allBarbers.length > 0) {
        return allBarbers.map((barber, idx) => ({
            id: barber.id,
            barberNumber: String(idx + 1).padStart(2, '0'),
            name: barber.name,
            specialty: barber.specialty || 'Master Barber',
            icon: 'scissors'
        }));
    }
    return DEFAULT_BARBERS;
}

window.jumpToDate = (targetDate) => {
    currentTimelineDate = targetDate;
    renderAppointments();
};

function renderQuickDateChips() {
    const container = document.getElementById('booking-quick-chips');
    if (!container) return;

    // Find all unique dates with appointments
    const dateCounts = {};
    allAppointments.forEach(apt => {
        if (apt.status !== 'Cancelled') {
            const d = normalizeDateStr(apt.date, apt.booking_reference);
            if (d) {
                dateCounts[d] = (dateCounts[d] || 0) + 1;
            }
        }
    });

    const dates = Object.keys(dateCounts).sort();
    if (dates.length === 0) {
        container.innerHTML = '';
        return;
    }

    let chipsHtml = `
        <span class="text-xs text-gray-400 flex items-center gap-1 font-medium mr-1 py-1">
            <i data-lucide="calendar-check" class="w-3.5 h-3.5 text-gold"></i>
            Dates with Bookings:
        </span>
    `;

    dates.forEach(dStr => {
        const parts = dStr.split('-').map(Number);
        const dObj = new Date(parts[0], parts[1] - 1, parts[2]);
        const label = dObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        const count = dateCounts[dStr];
        const isSelected = dStr === currentTimelineDate;

        chipsHtml += `
            <button onclick="jumpToDate('${dStr}')" 
                    class="py-1 px-3 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                        isSelected 
                        ? 'bg-[#C9A227] text-black shadow-md ring-2 ring-gold/40' 
                        : 'bg-[#1a1d27] text-gray-300 hover:text-white hover:bg-[#252836] border border-[rgba(255,255,255,0.08)]'
                    }">
                <span>${label}</span>
                <span class="text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-black/25 text-black' : 'bg-[#C9A227]/25 text-gold font-bold'}">${count}</span>
            </button>
        `;
    });

    container.innerHTML = chipsHtml;
}

function renderAppointments() {
    document.getElementById('appointments-loading').classList.add('hidden');

    // Update Date Display
    const dateInput = document.getElementById('filter-date');
    if (dateInput) dateInput.value = currentTimelineDate;

    const dateDisplay = document.getElementById('current-date-display');
    if (dateDisplay) {
        const parts = currentTimelineDate.split('-').map(Number);
        const dObj = new Date(parts[0], parts[1] - 1, parts[2]);
        dateDisplay.textContent = dObj.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    // Filter appointments for selected date
    const statusFilter = document.getElementById('filter-status')?.value || 'all';

    let dayApts = allAppointments.filter(apt => {
        return normalizeDateStr(apt.date, apt.booking_reference) === currentTimelineDate;
    });

    if (statusFilter !== 'all') {
        dayApts = dayApts.filter(apt => (apt.status || 'Confirmed') === statusFilter);
    }

    // ONLY use demo if demoMode is explicitly enabled by the user in Parameters
    const useDemo = Boolean(timelineConfig.demoMode);
    const activeApts = useDemo ? SCREENSHOT_DEMO_APTS : dayApts;

    // Render quick-jump chips for dates with bookings
    renderQuickDateChips();

    // Render Timeline View
    renderTimelineView(activeApts, useDemo);

    // Render Table View (Keeps both views updated)
    renderTableView(dayApts);

    // Ensure correct view is visible
    setViewMode(currentViewMode);

    lucide.createIcons();
}

function renderTimelineView(appointments, isDemo = false) {
    const container = document.getElementById('timeline-view-container');
    const gridInner = document.getElementById('sanctuary-grid-inner');
    if (!gridInner) return;

    const barbers = getActiveBarbers();
    const { startHour, endHour, hourWidth } = timelineConfig;
    const hours = [];
    for (let h = startHour; h <= endHour; h++) {
        hours.push(h);
    }

    const totalTimelineWidth = hours.length * hourWidth;
    const startMinutesOfDay = startHour * 60;
    const endMinutesOfDay = (endHour + 1) * 60;

    // Build Header Row
    let html = `
        <div class="sanctuary-header-row flex w-full border-b border-[#ebe7df]">
            <!-- Top Left Barber Label -->
            <div class="sanctuary-suite-col sticky left-0 z-30 p-3 sm:p-4 flex flex-col justify-center bg-[#f7f5f0]">
                <span class="text-[11px] font-bold tracking-[0.16em] text-[#4a453e] uppercase leading-tight">BARBERSHOP</span>
                <span class="text-[11px] font-bold tracking-[0.16em] text-[#4a453e] uppercase leading-tight">BARBERS</span>
            </div>
            <!-- Horizontal Timeline Hour Header -->
            <div class="flex relative h-12 items-center" style="width: ${totalTimelineWidth}px;">
                ${hours.map(h => `
                    <div style="width: ${hourWidth}px;" class="text-xs font-semibold text-[#8c8275] tracking-wider text-left pl-3">
                        ${String(h).padStart(2, '0')}:00
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    // Calculate current time line if viewing today
    const todayStr = getTodayStr();
    const isToday = currentTimelineDate === todayStr;
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    let nowLineHtml = '';

    if (isToday && nowMinutes >= startMinutesOfDay && nowMinutes <= endMinutesOfDay) {
        const nowLeft = ((nowMinutes - startMinutesOfDay) / 60) * hourWidth;
        nowLineHtml = `
            <div class="sanctuary-now-line" style="left: ${nowLeft}px;">
                <span class="sanctuary-now-badge">NOW</span>
            </div>
        `;
    }

    // Helper banner if no appointments on this date
    if (!isDemo && appointments.length === 0) {
        html += `
            <div class="px-4 py-2 bg-[#f2efe9] border-b border-[#ebe7df] text-xs text-[#78716c] flex items-center justify-between">
                <span class="flex items-center gap-1.5 font-medium">
                    <i data-lucide="calendar" class="w-3.5 h-3.5 text-[#8c8275]"></i>
                    <span>No appointments scheduled for this date. Click any barber lane to add a booking.</span>
                </span>
            </div>
        `;
    }

    // Render Each Barber Row
    barbers.forEach((barber, idx) => {
        // Find appointments for this barber
        const barberApts = appointments.filter(apt => {
            if (!apt.barber_id) return false;
            const aId = String(apt.barber_id).trim().toLowerCase();
            const bId = String(barber.id).trim().toLowerCase();
            return aId === bId || aId === bId.replace('barber_', '') || aId.replace('barber_', '') === bId;
        });

        html += `
            <div class="sanctuary-row flex w-full">
                <!-- Left Barber Info -->
                <div class="sanctuary-suite-col sticky left-0 z-20 p-3.5 sm:p-4 flex flex-col justify-between bg-[#f7f5f0]">
                    <div>
                        <div class="leading-none">
                            <span class="text-xs font-bold text-[#1c1917] tracking-wider block">Barber</span>
                            <span class="text-2xl font-black text-[#1c1917] tracking-tight block">${barber.barberNumber}</span>
                        </div>
                        <div class="text-[11px] font-medium text-[#78716c] leading-snug mt-1 line-clamp-2">
                            ${barber.specialty}
                        </div>
                    </div>
                    <div class="flex items-center gap-1.5 text-xs text-[#57534e] font-medium mt-2">
                        <i data-lucide="${barber.icon || 'scissors'}" class="w-3.5 h-3.5 text-[#8c8275]"></i>
                        <span class="truncate font-semibold">${barber.name}</span>
                    </div>
                </div>

                <!-- Right Timeline Track -->
                <div class="sanctuary-lane flex-grow relative" style="width: ${totalTimelineWidth}px;" onclick="handleLaneClick(event, '${barber.id}')">
                    <!-- Vertical Hour Gridlines -->
                    ${hours.map((h, i) => `
                        <div class="sanctuary-hour-line" style="left: ${i * hourWidth}px;"></div>
                    `).join('')}

                    <!-- Now Line (if today) -->
                    ${idx === 0 ? nowLineHtml : ''}

                    <!-- Appointments Cards -->
                    ${barberApts.map(apt => renderSanctuaryCard(apt, startMinutesOfDay, hourWidth)).join('')}
                </div>
            </div>
        `;
    });

    gridInner.innerHTML = html;
}

function renderSanctuaryCard(apt, startMinutesOfDay, hourWidth) {
    if (apt.is_turnover) {
        // Peach Ozone Turnover card
        const startMins = parseTimeToMinutes(apt.start_time) || startMinutesOfDay;
        const endMins = parseTimeToMinutes(apt.end_time) || (startMins + 30);
        const duration = Math.max(25, endMins - startMins);
        const left = ((startMins - startMinutesOfDay) / 60) * hourWidth;
        const width = Math.max(50, (duration / 60) * hourWidth);

        return `
            <div class="sanctuary-card sanctuary-card-turnover" 
                 style="left: ${left}px; width: ${width}px;" 
                 title="Ozone Turnover / Sanitization Buffer"
                 onclick="event.stopPropagation()">
                <div class="flex flex-col items-center justify-center gap-1">
                    <i data-lucide="spray-can" class="w-4 h-4 text-[#ba583c]"></i>
                    <span class="text-[10px] font-bold tracking-wider text-[#9a4c33] hidden sm:inline">TURNOVER</span>
                </div>
            </div>
        `;
    }

    const startMins = parseTimeToMinutes(apt.start_time) || startMinutesOfDay;
    const endMins = parseTimeToMinutes(apt.end_time) || (startMins + 45);
    const duration = Math.max(30, endMins - startMins);

    const left = Math.max(4, ((startMins - startMinutesOfDay) / 60) * hourWidth);
    const width = Math.max(120, (duration / 60) * hourWidth);

    // Resolve details
    const custName = apt.customer_name || (allCustomers.find(c => c.id === apt.customer_id)?.name) || 'Customer';
    const srvName = apt.service_name || (allServices.find(s => s.id === apt.service_id)?.name) || 'Service';
    const timeDisplay = `${normalizeTime24(apt.start_time)} - ${normalizeTime24(apt.end_time)}`;

    const status = apt.status || 'Confirmed';
    let cardClass = 'sanctuary-card-confirmed';
    let statusBadge = '';

    if (status === 'Active Protocol' || status === 'In Protocol') {
        cardClass = 'sanctuary-card-active';
        statusBadge = `
            <div class="flex items-center justify-between w-full">
                <span class="card-badge text-[10px] font-bold tracking-wider flex items-center gap-1 uppercase">
                    <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                    IN PROTOCOL
                </span>
                <span class="card-time text-[10px] font-mono">${timeDisplay}</span>
            </div>
        `;
    } else if (status === 'Arrived Lounge') {
        cardClass = 'sanctuary-card-arrived';
        statusBadge = `
            <div class="flex items-center justify-between w-full">
                <span class="card-badge text-[10px] font-bold tracking-wider uppercase">ARRIVED LOUNGE</span>
                <span class="card-time text-[10px] font-semibold">${normalizeTime24(apt.start_time)}</span>
            </div>
        `;
    } else if (status === 'Starting Soon') {
        cardClass = 'sanctuary-card-arrived';
        statusBadge = `
            <div class="flex items-center justify-between w-full">
                <span class="card-badge text-[10px] font-bold tracking-wider uppercase">STARTING SOON</span>
                <span class="card-time text-[10px] font-semibold">${normalizeTime24(apt.start_time)}</span>
            </div>
        `;
    } else if (status === 'Room Prepped') {
        cardClass = 'sanctuary-card-arrived';
        statusBadge = `
            <div class="flex items-center justify-between w-full">
                <span class="card-badge text-[10px] font-bold tracking-wider uppercase">ROOM PREPPED</span>
                <span class="card-time text-[10px] font-semibold">${normalizeTime24(apt.start_time)}</span>
            </div>
        `;
    } else if (status === 'Completed' || status === 'Finished') {
        cardClass = 'sanctuary-card-completed';
        statusBadge = `
            <div class="flex items-center justify-between w-full">
                <span class="card-badge text-[10px] font-bold tracking-wider uppercase flex items-center gap-0.5">
                    COMPLETED <i data-lucide="check" class="w-3 h-3 text-green-600 inline"></i>
                </span>
                <span class="card-time text-[10px] font-semibold">${normalizeTime24(apt.start_time)}</span>
            </div>
        `;
    } else {
        // Confirmed Reservation
        cardClass = 'sanctuary-card-confirmed';
        statusBadge = `
            <div class="flex items-center justify-between w-full">
                <span class="card-badge text-[10px] font-bold tracking-wider uppercase">CONFIRMED</span>
                <span class="card-time text-[10px] font-semibold">${normalizeTime24(apt.start_time)}</span>
            </div>
        `;
    }

    const aptJson = JSON.stringify(apt).replace(/'/g, "&#39;");

    return `
        <div class="sanctuary-card ${cardClass}" 
             style="left: ${left}px; width: ${width}px;" 
             onclick="event.stopPropagation(); openAptDetailModal(${aptJson})"
             title="${custName} - ${srvName} (${timeDisplay})">
            ${statusBadge}
            <div class="card-client font-bold text-xs sm:text-sm truncate leading-tight">
                ${custName}
            </div>
            <div class="card-service text-[11px] truncate font-medium leading-none">
                ${srvName}
            </div>
        </div>
    `;
}

function handleLaneClick(event, barberId) {
    const laneRect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - laneRect.left;
    const { startHour, hourWidth } = timelineConfig;
    const clickedMinutes = (clickX / hourWidth) * 60 + (startHour * 60);

    // Open booking modal
    openBookingModal();
}

function renderTableView(dayApts) {
    const tbody = document.getElementById('table-body');
    if (!tbody) return;

    if (dayApts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-gray-500">No appointments found for this date.</td></tr>';
        return;
    }

    tbody.innerHTML = dayApts.map(apt => {
        const srv = allServices.find(s => s.id === apt.service_id) || {name: apt.service_name || 'Service'};
        const brb = allBarbers.find(b => b.id === apt.barber_id) || {name: 'Barber'};
        const cust = allCustomers.find(c => c.id === apt.customer_id) || {name: apt.customer_name || 'Customer', email: '', phone: ''};
        
        const aptDate = new Date(normalizeDateStr(apt.date) + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        
        let statusBadge = `<span class="neu-pill-inset text-gray-300 font-medium px-2.5 py-1 text-xs">${apt.status || 'Confirmed'}</span>`;
        if (apt.status === 'Active Protocol') statusBadge = '<span class="neu-pill-inset text-amber-400 font-semibold px-2.5 py-1 text-xs">Active Protocol</span>';
        else if (apt.status === 'Confirmed') statusBadge = '<span class="neu-pill-inset text-green-400 font-semibold px-2.5 py-1 text-xs">Confirmed</span>';
        else if (apt.status === 'Cancelled') statusBadge = '<span class="neu-pill-inset text-red-400 font-semibold px-2.5 py-1 text-xs">Cancelled</span>';

        return `
            <tr class="border-b border-[rgba(255,255,255,0.04)] hover:bg-[#181a24] transition-colors cursor-pointer" onclick='openAptDetailModal(${JSON.stringify(apt).replace(/'/g, "&#39;")})'>
                <td class="p-4 whitespace-nowrap text-gray-500 text-xs font-mono">${(apt.booking_reference || apt.id || '').substring(0, 12)}</td>
                <td class="p-4 whitespace-nowrap">
                    <div class="font-medium text-white">${aptDate}</div>
                    <div class="text-gold text-xs font-medium font-mono">${normalizeTime24(apt.start_time)} - ${normalizeTime24(apt.end_time)}</div>
                </td>
                <td class="p-4">
                    <div class="font-medium text-white">${cust.name}</div>
                    <div class="text-gray-400 text-xs">${cust.phone || ''}</div>
                </td>
                <td class="p-4">
                    <div class="font-medium text-gray-200">${srv.name}</div>
                    <div class="text-gray-400 text-xs">with ${brb.name}</div>
                </td>
                <td class="p-4 whitespace-nowrap">${statusBadge}</td>
                <td class="p-4 whitespace-nowrap">
                    <button onclick="event.stopPropagation(); cancelAppointment('${apt.id}')" class="text-xs text-red-400 hover:text-red-300 underline">Cancel</button>
                </td>
            </tr>
        `;
    }).join('');
}

// Appointment Detail Modal Handlers
window.openAptDetailModal = (apt) => {
    currentActiveApt = apt;
    const cust = allCustomers.find(c => c.id === apt.customer_id) || {};
    const srv = allServices.find(s => s.id === apt.service_id) || {};
    const brb = allBarbers.find(b => b.id === apt.barber_id) || {};

    const custName = apt.customer_name || cust.name || 'Valued Guest';
    const custPhone = apt.phone || cust.phone || 'Not provided';
    const custEmail = apt.email || cust.email || 'Not provided';
    const srvName = apt.service_name || srv.name || 'Treatment';
    const price = apt.price || srv.price || 0;
    const notes = apt.customer_notes || 'None';
    const timeDisplay = `${normalizeTime24(apt.start_time)} - ${normalizeTime24(apt.end_time)}`;

    document.getElementById('modal-apt-ref').textContent = apt.booking_reference || apt.id || 'BARBER';
    document.getElementById('modal-apt-customer').textContent = custName;
    document.getElementById('modal-apt-service').textContent = srvName;
    document.getElementById('modal-apt-price').textContent = Utils.formatCurrency(price);
    document.getElementById('modal-apt-barber').textContent = brb.name || apt.barber_name || 'Barber';
    document.getElementById('modal-apt-time').textContent = timeDisplay;
    document.getElementById('modal-apt-date').textContent = normalizeDateStr(apt.date) || currentTimelineDate;
    document.getElementById('modal-apt-phone').textContent = custPhone;
    document.getElementById('modal-apt-email').textContent = custEmail;
    document.getElementById('modal-apt-notes').textContent = notes;

    Utils.showModal('apt-detail-modal');
    lucide.createIcons();
};

window.closeAptDetailModal = () => {
    Utils.hideModal('apt-detail-modal');
    currentActiveApt = null;
};

window.setAppointmentStatus = async (newStatus) => {
    if (!currentActiveApt) return;
    currentActiveApt.status = newStatus;

    // If it's a real appointment in allAppointments, update it
    const realApt = allAppointments.find(a => a.id === currentActiveApt.id);
    if (realApt) {
        realApt.status = newStatus;
    }

    Utils.showToast(`Status updated to ${newStatus}`);
    closeAptDetailModal();
    renderAppointments();
    renderDashboard();
};

window.cancelCurrentApt = async () => {
    if (!currentActiveApt) return;
    const id = currentActiveApt.id;
    closeAptDetailModal();
    await cancelAppointment(id);
};

window.cancelAppointment = async (id) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;
    try {
        await API.post('cancelAppointment', { id });
        Utils.showToast("Appointment cancelled");
        const res = await API.request('GET', 'getAppointments');
        allAppointments = res || [];
        renderAppointments();
        renderDashboard();
    } catch(e) {
        // If demo appointment or offline
        const idx = allAppointments.findIndex(a => a.id === id);
        if (idx !== -1) {
            allAppointments[idx].status = 'Cancelled';
            Utils.showToast("Appointment marked as Cancelled");
            renderAppointments();
            renderDashboard();
        } else {
            Utils.showToast(e.message || "Cancelled locally", 'error');
        }
    }
};

// View Parameters Modal Handlers
window.openViewParamsModal = () => {
    document.getElementById('param-start-hour').value = timelineConfig.startHour;
    document.getElementById('param-end-hour').value = timelineConfig.endHour;
    document.getElementById('param-show-turnover').checked = timelineConfig.showTurnover;
    document.getElementById('param-demo-mode').checked = timelineConfig.demoMode;
    Utils.showModal('view-params-modal');
    lucide.createIcons();
};

window.closeViewParamsModal = () => {
    Utils.hideModal('view-params-modal');
};

window.applyViewParams = () => {
    timelineConfig.startHour = parseInt(document.getElementById('param-start-hour').value, 10) || 9;
    timelineConfig.endHour = parseInt(document.getElementById('param-end-hour').value, 10) || 16;
    timelineConfig.showTurnover = document.getElementById('param-show-turnover').checked;
    timelineConfig.demoMode = document.getElementById('param-demo-mode').checked;

    closeViewParamsModal();
    Utils.showToast("Timeline parameters updated");
    renderAppointments();
};


// --- BARBERS ---
function renderBarbers() {
    document.getElementById('barbers-loading').classList.add('hidden');
    const grid = document.getElementById('barbers-grid-admin');
    grid.classList.remove('hidden');

    grid.innerHTML = allBarbers.map(barber => `
        <div class="neu-card p-6 relative flex flex-col justify-between">
            <div>
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h4 class="playfair text-xl font-bold text-white">${barber.name}</h4>
                        <p class="text-xs text-gold uppercase tracking-wider font-semibold mt-1">${barber.experience} | ${barber.specialty}</p>
                    </div>
                    <div class="flex gap-2">
                        <button onclick='editBarber(${JSON.stringify(barber).replace(/'/g, "&#39;")})' class="w-8 h-8 neu-circle flex items-center justify-center text-gray-400 hover:text-gold transition-colors"><i data-lucide="edit" class="w-3.5 h-3.5"></i></button>
                        <button onclick="deleteBarber('${barber.id}')" class="w-8 h-8 neu-circle flex items-center justify-center text-gray-400 hover:text-red-400 transition-colors"><i data-lucide="trash" class="w-3.5 h-3.5"></i></button>
                    </div>
                </div>
                <div class="text-sm text-gray-400 mb-5 line-clamp-3 leading-relaxed">${barber.bio}</div>
            </div>
            <div class="text-xs text-gray-400 border-t border-[rgba(255,255,255,0.05)] pt-4 flex justify-between">
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
        <div class="neu-card p-6 relative flex flex-col justify-between">
            <div>
                <div class="flex justify-between items-start mb-2">
                    <h4 class="playfair text-xl font-bold text-white">${srv.name}</h4>
                    <div class="flex gap-2">
                        <button onclick='editService(${JSON.stringify(srv).replace(/'/g, "&#39;")})' class="w-8 h-8 neu-circle flex items-center justify-center text-gray-400 hover:text-gold transition-colors"><i data-lucide="edit" class="w-3.5 h-3.5"></i></button>
                        <button onclick="deleteService('${srv.id}')" class="w-8 h-8 neu-circle flex items-center justify-center text-gray-400 hover:text-red-400 transition-colors"><i data-lucide="trash" class="w-3.5 h-3.5"></i></button>
                    </div>
                </div>
                <span class="neu-pill-inset text-xs text-gold uppercase tracking-wider font-semibold mb-3 inline-block">${srv.category}</span>
                <p class="text-gray-400 text-sm mb-5 leading-relaxed">${srv.description}</p>
            </div>
            <div class="flex justify-between items-center pt-4 border-t border-[rgba(255,255,255,0.05)]">
                <span class="text-gold font-bold text-lg">${Utils.formatCurrency(srv.price)}</span>
                <span class="text-xs text-gray-400 font-medium">${srv.duration_minutes} min</span>
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

window.openBookingModal = () => {
    document.getElementById('booking-iframe').src = '../booking.html';
    Utils.showModal('booking-modal');
};

window.closeBookingModal = () => {
    Utils.hideModal('booking-modal');
    document.getElementById('booking-iframe').src = 'about:blank';
    // Reload data when closing in case they booked something
    loadInitialData();
};




function setupSidebar() {
    const sidebar = document.getElementById('admin-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const openBtn = document.getElementById('open-sidebar-btn');
    const closeBtn = document.getElementById('close-sidebar-btn');
    
    if(!sidebar || !openBtn) return;

    function openSidebar() {
        sidebar.classList.remove('-translate-x-full');
        overlay.classList.remove('hidden');
    }

    function closeSidebar() {
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
    }

    openBtn.addEventListener('click', openSidebar);
    closeBtn.addEventListener('click', closeSidebar);
    overlay.addEventListener('click', closeSidebar);

    // Close sidebar on mobile when a link is clicked
    document.querySelectorAll('#admin-nav a').forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth < 768) {
                closeSidebar();
            }
        });
    });
}

