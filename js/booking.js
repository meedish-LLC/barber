const state = {
    step: 1,
    services: [],
    barbers: [],
    selections: {
        serviceId: null,
        barberId: null, // 'any' or specific ID
        date: null,
        timeId: null, // format "barberId|HH:MM|HH:MM"
        customer: {
            name: '',
            phone: '',
            email: '',
            notes: ''
        }
    },
    availableSlots: []
};

const steps = [
    { num: 1, id: 'step-service', title: 'Service' },
    { num: 2, id: 'step-barber', title: 'Barber' },
    { num: 3, id: 'step-date', title: 'Date' },
    { num: 4, id: 'step-time', title: 'Time' },
    { num: 5, id: 'step-details', title: 'Details' },
    { num: 6, id: 'step-confirm', title: 'Confirm' }
];

document.addEventListener('DOMContentLoaded', async () => {
    lucide.createIcons();
    setupEventListeners();
    await initializeData();
    renderStep();
    updateProgress();
});

async function initializeData() {
    try {
        const [services, barbers] = await Promise.all([
            API.getServices(),
            API.getBarbers()
        ]);
        state.services = services;
        state.barbers = barbers;

        // URL parameters for pre-selection
        const urlParams = new URLSearchParams(window.location.search);
        const preService = urlParams.get('service');
        if (preService && state.services.find(s => s.id === preService)) {
            state.selections.serviceId = preService;
            state.step = 2; // Jump to barber
        }
        
        const preBarber = urlParams.get('barber');
        if (preBarber && state.barbers.find(b => b.id === preBarber)) {
            state.selections.barberId = preBarber;
            if(state.step === 2) state.step = 3;
        }

    } catch (e) {
        Utils.showToast('Failed to initialize booking system.', 'error');
        document.getElementById('step-content').innerHTML = '<p class="text-red-500">Error loading data. Please refresh.</p>';
    }
}

function setupEventListeners() {
    document.getElementById('btn-back').addEventListener('click', () => {
        if (state.step > 1) {
            state.step--;
            renderStep();
            updateProgress();
        }
    });

    document.getElementById('btn-next').addEventListener('click', () => {
        if (validateCurrentStep() && state.step < 6) {
            state.step++;
            
            // Re-render button visibility for the new step
            const btnBack = document.getElementById('btn-back');
            const btnNext = document.getElementById('btn-next');
            const btnConfirm = document.getElementById('btn-confirm');
            btnBack.classList.toggle('hidden', state.step === 1);
            btnNext.classList.toggle('hidden', state.step === 6);
            btnConfirm.classList.toggle('hidden', state.step !== 6);

            if (state.step === 4) {
                checkNextButton(); // Ensure it disables until time is selected
                fetchAvailability();
            } else {
                renderStep();
            }
            updateProgress();
        }
    });

    document.getElementById('btn-confirm').addEventListener('click', submitBooking);
}

function updateProgress() {
    const list = document.getElementById('progress-steps');
    if (!list) return;

    list.innerHTML = steps.map(s => {
        let statusClass = 'text-gray-500';
        let bulletClass = 'bg-charcoal border-charcoal';
        
        if (s.num < state.step) {
            statusClass = 'text-gold';
            bulletClass = 'bg-gold border-gold';
        } else if (s.num === state.step) {
            statusClass = 'text-white font-bold';
            bulletClass = 'bg-charcoal border-gold';
        }

        return `
            <li class="relative flex items-center gap-6">
                <div class="before:absolute before:left-[11px] before:h-full before:w-[1px] before:bg-charcoal flex items-center justify-center w-6 h-6 rounded-full border-2 ${bulletClass} z-10">
                    ${s.num < state.step ? '<i data-lucide="check" class="w-3 h-3 text-[#0B0B0B]"></i>' : `<span class="text-xs ${s.num === state.step ? 'text-gold' : 'text-gray-500'}">${s.num}</span>`}
                </div>
                <p class="${statusClass} text-sm uppercase tracking-wider">${s.title}</p>
            </li>
        `;
    }).join('');
    
    lucide.createIcons();
    updateSummary();
}

function updateSummary() {
    const container = document.getElementById('booking-summary');
    const content = document.getElementById('summary-content');
    
    if (state.step === 1) {
        container.classList.add('hidden');
        return;
    }
    container.classList.remove('hidden');

    let html = '';
    if (state.selections.serviceId) {
        const srv = state.services.find(s => s.id === state.selections.serviceId);
        html += `<div class="flex justify-between border-b border-charcoal pb-2"><span>Service</span> <span class="text-white">${srv.name}</span></div>`;
    }
    if (state.selections.barberId) {
        const brb = state.selections.barberId === 'any' ? {name: 'Any Available'} : state.barbers.find(b => b.id === state.selections.barberId);
        html += `<div class="flex justify-between border-b border-charcoal pb-2 mt-2"><span>Barber</span> <span class="text-white">${brb.name}</span></div>`;
    }
    if (state.selections.date) {
        html += `<div class="flex justify-between border-b border-charcoal pb-2 mt-2"><span>Date</span> <span class="text-white">${Utils.formatDate(state.selections.date)}</span></div>`;
    }
    if (state.selections.timeId) {
        const [_, start] = state.selections.timeId.split('|');
        html += `<div class="flex justify-between pb-2 mt-2"><span>Time</span> <span class="text-white text-gold">${Utils.formatTime(start)}</span></div>`;
    }

    content.innerHTML = html;
}

function checkNextButton() {
    const btn = document.getElementById('btn-next');
    btn.disabled = !validateCurrentStep();
}

function validateCurrentStep() {
    switch (state.step) {
        case 1: return !!state.selections.serviceId;
        case 2: return !!state.selections.barberId;
        case 3: return !!state.selections.date;
        case 4: return !!state.selections.timeId;
        case 5:
            const n = document.getElementById('cust-name');
            const p = document.getElementById('cust-phone');
            return n && p && n.value.trim() !== '' && p.value.trim() !== '';
        default: return true;
    }
}

function renderStep() {
    const content = document.getElementById('step-content');
    const btnBack = document.getElementById('btn-back');
    const btnNext = document.getElementById('btn-next');
    const btnConfirm = document.getElementById('btn-confirm');

    // Button visibility
    btnBack.classList.toggle('hidden', state.step === 1);
    btnNext.classList.toggle('hidden', state.step === 6);
    btnConfirm.classList.toggle('hidden', state.step !== 6);

    switch (state.step) {
        case 1: renderServices(content); break;
        case 2: renderBarbers(content); break;
        case 3: renderDate(content); break;
        case 4: renderTime(content); break; // Handled after fetch
        case 5: renderDetails(content); break;
        case 6: renderConfirm(content); break;
    }
    
    checkNextButton();
}

function renderServices(container) {
    let html = `<h3 class="playfair text-3xl font-bold mb-6">Select Service</h3>
                <div class="space-y-4 max-h-full overflow-y-auto pr-2">`;
    
    state.services.forEach(s => {
        const isSelected = state.selections.serviceId === s.id;
        html += `
            <div class="border ${isSelected ? 'border-gold bg-[rgba(201,162,39,0.05)]' : 'border-charcoal bg-[#111111]'} rounded-lg p-5 cursor-pointer hover:border-gold transition-colors" onclick="selectService('${s.id}')">
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="text-xl font-bold ${isSelected ? 'text-gold' : 'text-white'}">${s.name}</h4>
                        <p class="text-gray-400 text-sm mt-1">${s.description}</p>
                    </div>
                    <div class="text-right">
                        <span class="block font-bold">${Utils.formatCurrency(s.price)}</span>
                        <span class="text-xs text-gray-500">${s.duration_minutes} min</span>
                    </div>
                </div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

window.selectService = (id) => {
    state.selections.serviceId = id;
    renderServices(document.getElementById('step-content'));
    checkNextButton();
};

function renderBarbers(container) {
    let html = `<h3 class="playfair text-3xl font-bold mb-6">Select Barber</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">`;
    
    // Any barber option
    const anySelected = state.selections.barberId === 'any';
    html += `
        <div class="border ${anySelected ? 'border-gold bg-[rgba(201,162,39,0.05)]' : 'border-charcoal bg-[#111111]'} rounded-lg p-5 cursor-pointer hover:border-gold flex flex-col items-center justify-center text-center h-48" onclick="selectBarber('any')">
            <div class="w-16 h-16 rounded-full bg-charcoal border border-gray-700 flex items-center justify-center mb-3 text-gold">
                <i data-lucide="users" class="w-8 h-8"></i>
            </div>
            <h4 class="text-lg font-bold ${anySelected ? 'text-gold' : 'text-white'}">Any Available</h4>
            <p class="text-xs text-gray-500 mt-1">First available time</p>
        </div>
    `;

    state.barbers.forEach(b => {
        const isSelected = state.selections.barberId === b.id;
        const img = b.image_url || 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&q=80&w=150';
        html += `
            <div class="border ${isSelected ? 'border-gold bg-[rgba(201,162,39,0.05)]' : 'border-charcoal bg-[#111111]'} rounded-lg p-5 cursor-pointer hover:border-gold flex flex-col items-center text-center h-48" onclick="selectBarber('${b.id}')">
                <img src="${img}" alt="${b.name}" class="w-16 h-16 rounded-full object-cover mb-3 border ${isSelected ? 'border-gold' : 'border-gray-700'} grayscale hover:grayscale-0 transition-all">
                <h4 class="text-lg font-bold ${isSelected ? 'text-gold' : 'text-white'}">${b.name}</h4>
                <p class="text-xs text-gray-500 mt-1 line-clamp-1">${b.specialty}</p>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
    lucide.createIcons();
}

window.selectBarber = (id) => {
    state.selections.barberId = id;
    renderBarbers(document.getElementById('step-content'));
    checkNextButton();
};

function renderDate(container) {
    // Simple custom date picker logic
    let html = `<h3 class="playfair text-3xl font-bold mb-6">Select Date</h3>
                <div class="max-w-sm mx-auto">
                    <input type="date" id="date-picker" class="input-field text-xl py-4" min="${new Date().toLocaleDateString('en-CA')}" onchange="selectDate(this.value)">
                </div>`;
    container.innerHTML = html;
    
    if (state.selections.date) {
        document.getElementById('date-picker').value = state.selections.date;
    }
}

window.selectDate = (val) => {
    state.selections.date = val;
    // reset time if date changes
    state.selections.timeId = null;
    checkNextButton();
};

async function fetchAvailability() {
    const container = document.getElementById('step-content');
    container.innerHTML = `
        <div class="flex items-center justify-center h-full flex-col">
            <i data-lucide="loader-2" class="w-10 h-10 animate-spin text-gold mb-4"></i>
            <p class="text-gray-400">Finding available slots...</p>
        </div>
    `;
    lucide.createIcons();

    try {
        const slots = await API.getAvailability(state.selections.barberId, state.selections.date, state.selections.serviceId);
        state.availableSlots = slots;
        renderTime(container);
    } catch (e) {
        container.innerHTML = `
            <div class="text-center text-red-500">
                <i data-lucide="alert-circle" class="w-10 h-10 mx-auto mb-2"></i>
                <p>Unable to load availability. Please try again.</p>
                <button class="btn-outline mt-4" onclick="fetchAvailability()">Retry</button>
            </div>
        `;
        lucide.createIcons();
    }
}

function renderTime(container) {
    if (state.availableSlots.length === 0) {
        container.innerHTML = `
            <h3 class="playfair text-3xl font-bold mb-6">Select Time</h3>
            <div class="text-center py-10 bg-[#111111] border border-charcoal rounded-lg">
                <p class="text-gray-400 mb-4">No available times on this date for the selected barber/service.</p>
                <button class="btn-outline" onclick="document.getElementById('btn-back').click()">Choose Another Date</button>
            </div>
        `;
        return;
    }

    let html = `<h3 class="playfair text-3xl font-bold mb-6">Select Time</h3>
                <div class="grid grid-cols-3 sm:grid-cols-4 gap-3">`;
    
    state.availableSlots.forEach(slot => {
        // ID composite to hold barber info in case 'any' was selected
        const tId = `${slot.barber_id}|${slot.start_time}|${slot.end_time}`;
        const isSelected = state.selections.timeId === tId;
        
        html += `
            <button class="py-3 px-2 border rounded text-center transition-colors ${isSelected ? 'border-gold bg-gold text-[#0B0B0B] font-bold' : 'border-charcoal bg-[#111111] text-white hover:border-gold'}"
                onclick="selectTime('${tId}')">
                ${Utils.formatTime(slot.start_time)}
            </button>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

window.selectTime = (id) => {
    state.selections.timeId = id;
    renderTime(document.getElementById('step-content'));
    checkNextButton();
};

function renderDetails(container) {
    const c = state.selections.customer;
    let html = `
        <h3 class="playfair text-3xl font-bold mb-6">Your Details</h3>
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-gray-400 mb-1">Full Name *</label>
                <input type="text" id="cust-name" class="input-field" value="${c.name}" oninput="updateCustomer('name', this.value)">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-400 mb-1">Phone Number *</label>
                <input type="tel" id="cust-phone" class="input-field" value="${c.phone}" oninput="updateCustomer('phone', this.value)">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-400 mb-1">Email Address</label>
                <input type="email" id="cust-email" class="input-field" value="${c.email}" oninput="updateCustomer('email', this.value)">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-400 mb-1">Additional Notes</label>
                <textarea id="cust-notes" class="input-field h-24" oninput="updateCustomer('notes', this.value)">${c.notes}</textarea>
            </div>
        </div>
    `;
    container.innerHTML = html;
}

window.updateCustomer = (field, val) => {
    state.selections.customer[field] = val;
    checkNextButton();
};

function renderConfirm(container) {
    const srv = state.services.find(s => s.id === state.selections.serviceId);
    const [bId, start, end] = state.selections.timeId.split('|');
    const brb = state.barbers.find(b => b.id === bId);
    const c = state.selections.customer;

    let html = `
        <h3 class="playfair text-3xl font-bold mb-8 text-center">Confirm Your Appointment</h3>
        
        <div class="bg-[#111111] border border-charcoal rounded-lg p-6 space-y-6">
            <div class="grid grid-cols-2 gap-4 border-b border-charcoal pb-6">
                <div>
                    <span class="block text-sm text-gray-500 uppercase">Service</span>
                    <span class="text-lg font-bold">${srv.name}</span>
                </div>
                <div>
                    <span class="block text-sm text-gray-500 uppercase">Price</span>
                    <span class="text-lg font-bold text-gold">${Utils.formatCurrency(srv.price)}</span>
                </div>
                <div>
                    <span class="block text-sm text-gray-500 uppercase">Barber</span>
                    <span class="text-lg">${brb.name}</span>
                </div>
                <div>
                    <span class="block text-sm text-gray-500 uppercase">Duration</span>
                    <span class="text-lg">${srv.duration_minutes} min</span>
                </div>
            </div>
            
            <div class="grid grid-cols-2 gap-4 border-b border-charcoal pb-6">
                <div>
                    <span class="block text-sm text-gray-500 uppercase">Date</span>
                    <span class="text-lg">${Utils.formatDate(state.selections.date)}</span>
                </div>
                <div>
                    <span class="block text-sm text-gray-500 uppercase">Time</span>
                    <span class="text-lg text-gold font-bold">${Utils.formatTime(start)}</span>
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <span class="block text-sm text-gray-500 uppercase">Name</span>
                    <span class="text-lg">${c.name}</span>
                </div>
                <div>
                    <span class="block text-sm text-gray-500 uppercase">Phone</span>
                    <span class="text-lg">${c.phone}</span>
                </div>
            </div>
        </div>
        <p class="text-sm text-gray-500 text-center mt-6">By confirming, you agree to our cancellation policy.</p>
    `;
    container.innerHTML = html;
}

async function submitBooking() {
    const btnConfirm = document.getElementById('btn-confirm');
    btnConfirm.disabled = true;
    btnConfirm.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin inline mr-2"></i> BOOKING...`;
    lucide.createIcons();

    const [bId, start, end] = state.selections.timeId.split('|');

    const payload = {
        service_id: state.selections.serviceId,
        barber_id: bId,
        date: state.selections.date,
        start_time: start,
        customer: state.selections.customer
    };

    try {
        const result = await API.createAppointment(payload);
        
        // Save minimal result to sessionStorage for confirmation page
        sessionStorage.setItem('booking_result', JSON.stringify({
            reference: result.reference,
            service: state.services.find(s => s.id === state.selections.serviceId).name,
            barber: state.barbers.find(b => b.id === bId).name,
            date: result.date,
            start: result.start_time,
            end: result.end_time
        }));

        window.location.href = 'booking-confirmation.html';

    } catch (e) {
        Utils.showToast(e.message, 'error');
        btnConfirm.disabled = false;
        btnConfirm.textContent = 'CONFIRM APPOINTMENT';
    }
}
