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
        const initData = await API.getInitData();
        state.services = initData.services;
        state.barbers = initData.barbers;

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
        let bulletHtml = '';
        
        if (s.num < state.step) {
            statusClass = 'text-gold font-medium';
            bulletHtml = `
                <div class="w-7 h-7 rounded-full bg-gold text-[#0d0f14] shadow-sm flex items-center justify-center font-bold z-10">
                    <i data-lucide="check" class="w-4 h-4 stroke-[2.5]"></i>
                </div>
            `;
        } else if (s.num === state.step) {
            statusClass = 'text-white font-bold';
            bulletHtml = `
                <div class="w-7 h-7 rounded-full neu-inset border border-gold text-gold flex items-center justify-center font-bold text-xs z-10 neu-step-active">
                    ${s.num}
                </div>
            `;
        } else {
            bulletHtml = `
                <div class="w-7 h-7 rounded-full neu-circle-inset text-gray-500 flex items-center justify-center text-xs z-10">
                    ${s.num}
                </div>
            `;
        }

        return `
            <li class="relative flex items-center gap-5">
                ${bulletHtml}
                <p class="${statusClass} text-sm uppercase tracking-wider">${s.title}</p>
            </li>
        `;
    }).join('');
    
    lucide.createIcons();
    updateSummary();

    // Mobile progress update
    const currentStepObj = steps.find(s => s.num === state.step);
    if (currentStepObj) {
        const mStepCurrent = document.getElementById('mobile-step-current');
        const mStepTitle = document.getElementById('mobile-step-title');
        const mProgressBar = document.getElementById('mobile-progress-bar');
        
        if (mStepCurrent) mStepCurrent.textContent = state.step;
        if (mStepTitle) mStepTitle.textContent = currentStepObj.title;
        if (mProgressBar) {
            const percentage = (state.step / steps.length) * 100;
            mProgressBar.style.width = `${percentage}%`;
        }
    }
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
        html += `<div class="flex justify-between border-b border-[rgba(255,255,255,0.05)] pb-2"><span class="text-gray-400">Service</span> <span class="text-white font-medium">${srv.name}</span></div>`;
    }
    if (state.selections.barberId) {
        const brb = state.selections.barberId === 'any' ? {name: 'Any Available'} : state.barbers.find(b => b.id === state.selections.barberId);
        html += `<div class="flex justify-between border-b border-[rgba(255,255,255,0.05)] pb-2 mt-2"><span class="text-gray-400">Barber</span> <span class="text-white font-medium">${brb.name}</span></div>`;
    }
    if (state.selections.date) {
        html += `<div class="flex justify-between border-b border-[rgba(255,255,255,0.05)] pb-2 mt-2"><span class="text-gray-400">Date</span> <span class="text-white font-medium">${Utils.formatDate(state.selections.date)}</span></div>`;
    }
    if (state.selections.timeId) {
        const [_, start] = state.selections.timeId.split('|');
        html += `<div class="flex justify-between pb-1 mt-2"><span class="text-gray-400">Time</span> <span class="text-gold font-bold">${Utils.formatTime(start)}</span></div>`;
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
            <div class="${isSelected ? 'neu-inset border border-gold/50' : 'neu-card-sm border border-[rgba(255,255,255,0.04)] hover:border-gold/30 hover:-translate-y-0.5'} rounded-xl p-5 cursor-pointer transition-all duration-200" onclick="selectService('${s.id}')">
                <div class="flex justify-between items-start">
                    <div>
                        <div class="flex items-center gap-2 mb-1">
                            ${isSelected ? '<span class="w-2.5 h-2.5 rounded-full bg-gold shadow-sm inline-block"></span>' : ''}
                            <h4 class="text-xl font-bold ${isSelected ? 'text-gold' : 'text-white'}">${s.name}</h4>
                        </div>
                        <p class="text-gray-400 text-sm mt-1 leading-relaxed">${s.description}</p>
                    </div>
                    <div class="text-right flex-shrink-0 ml-4">
                        <span class="block font-bold text-lg text-gold">${Utils.formatCurrency(s.price)}</span>
                        <span class="text-xs text-gray-400 font-medium">${s.duration_minutes} min</span>
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
                <div class="grid grid-cols-1 md:grid-cols-2 gap-5">`;
    
    // Any barber option
    const anySelected = state.selections.barberId === 'any';
    html += `
        <div class="${anySelected ? 'neu-inset border border-gold/50' : 'neu-card-sm border border-[rgba(255,255,255,0.04)] hover:border-gold/30 hover:-translate-y-0.5'} rounded-xl p-6 cursor-pointer flex flex-col items-center justify-center text-center h-52 transition-all duration-200" onclick="selectBarber('any')">
            <div class="w-16 h-16 rounded-full ${anySelected ? 'neu-inset text-gold border border-gold/30' : 'neu-circle text-gold'} flex items-center justify-center mb-3">
                <i data-lucide="users" class="w-7 h-7"></i>
            </div>
            <h4 class="text-lg font-bold ${anySelected ? 'text-gold' : 'text-white'}">Any Available</h4>
            <p class="text-xs text-gray-400 mt-1">First available time</p>
        </div>
    `;

    state.barbers.forEach(b => {
        const isSelected = state.selections.barberId === b.id;
        const img = b.image_url || 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&q=80&w=150';
        html += `
            <div class="${isSelected ? 'neu-inset border border-gold/50' : 'neu-card-sm border border-[rgba(255,255,255,0.04)] hover:border-gold/30 hover:-translate-y-0.5'} rounded-xl p-6 cursor-pointer flex flex-col items-center text-center h-52 transition-all duration-200" onclick="selectBarber('${b.id}')">
                <img src="${img}" alt="${b.name}" class="w-16 h-16 rounded-full object-cover mb-3 ${isSelected ? 'border-2 border-gold shadow-md' : 'border border-[rgba(255,255,255,0.1)] grayscale hover:grayscale-0'} transition-all">
                <h4 class="text-lg font-bold ${isSelected ? 'text-gold' : 'text-white'}">${b.name}</h4>
                <p class="text-xs text-gray-400 mt-1 line-clamp-1">${b.specialty}</p>
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
    let html = `<h3 class="playfair text-3xl font-bold mb-6">Select Date</h3>
                <div class="max-w-md mx-auto neu-inset p-8 rounded-2xl text-center border border-[rgba(255,255,255,0.04)]">
                    <div class="w-12 h-12 neu-circle mx-auto mb-4 flex items-center justify-center text-gold">
                        <i data-lucide="calendar" class="w-6 h-6"></i>
                    </div>
                    <label class="block text-sm text-gray-300 font-medium mb-4 uppercase tracking-wider">Choose Appointment Date</label>
                    <input type="date" id="date-picker" class="input-field text-xl py-4 text-center cursor-pointer font-medium" min="${new Date().toLocaleDateString('en-CA')}" onchange="selectDate(this.value)">
                </div>`;
    container.innerHTML = html;
    lucide.createIcons();
    
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
        <div class="flex items-center justify-center h-full flex-col py-16">
            <i data-lucide="loader-2" class="w-10 h-10 animate-spin text-gold mb-4"></i>
            <p class="text-gray-400 font-medium">Finding available slots...</p>
        </div>
    `;
    if (window.lucide) {
        lucide.createIcons();
    }

    try {
        const slots = await API.getAvailability(state.selections.barberId, state.selections.date, state.selections.serviceId);
        state.availableSlots = slots;
        renderTime(container);
    } catch (e) {
        container.innerHTML = `
            <div class="text-center text-red-400 py-12">
                <i data-lucide="alert-circle" class="w-10 h-10 mx-auto mb-3"></i>
                <p class="font-medium">Unable to load availability. Please try again.</p>
                <button class="btn-outline mt-6" onclick="fetchAvailability()">Retry</button>
            </div>
        `;
        if (window.lucide) {
            lucide.createIcons();
        }
    }
}

function renderTime(container) {
    if (state.availableSlots.length === 0) {
        container.innerHTML = `
            <h3 class="playfair text-3xl font-bold mb-6">Select Time</h3>
            <div class="text-center py-12 neu-inset rounded-2xl max-w-lg mx-auto p-8 border border-[rgba(255,255,255,0.04)]">
                <i data-lucide="clock" class="w-10 h-10 text-gray-500 mx-auto mb-3"></i>
                <p class="text-gray-400 mb-6 font-medium">No available times on this date for the selected barber/service.</p>
                <button class="btn-outline" onclick="document.getElementById('btn-back').click()">Choose Another Date</button>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
        return;
    }

    let html = `<h3 class="playfair text-3xl font-bold mb-6">Select Time</h3>
                <div class="grid grid-cols-3 sm:grid-cols-4 gap-3.5">`;
    
    state.availableSlots.forEach(slot => {
        const tId = `${slot.barber_id}|${slot.start_time}|${slot.end_time}`;
        const isSelected = state.selections.timeId === tId;
        
        html += `
            <button class="neu-slot-btn py-3.5 px-3 rounded-xl text-center transition-all ${isSelected ? 'selected' : 'text-white'}"
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
        <div class="neu-card p-6 md:p-8 space-y-5 max-w-xl mx-auto border border-[rgba(255,255,255,0.04)]">
            <div>
                <label class="block text-sm font-medium text-gray-300 mb-1.5">Full Name *</label>
                <input type="text" id="cust-name" class="input-field" placeholder="John Doe" value="${c.name}" oninput="updateCustomer('name', this.value)">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-300 mb-1.5">Phone Number *</label>
                <input type="tel" id="cust-phone" class="input-field" placeholder="(555) 000-0000" value="${c.phone}" oninput="updateCustomer('phone', this.value)">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-300 mb-1.5">Email Address</label>
                <input type="email" id="cust-email" class="input-field" placeholder="john@example.com" value="${c.email}" oninput="updateCustomer('email', this.value)">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-300 mb-1.5">Additional Notes</label>
                <textarea id="cust-notes" class="input-field h-24" placeholder="Any preferences, allergies, or styling requests..." oninput="updateCustomer('notes', this.value)">${c.notes}</textarea>
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
        
        <div class="neu-inset rounded-2xl p-6 md:p-8 space-y-6 max-w-2xl mx-auto border border-[rgba(255,255,255,0.04)]">
            <div class="grid grid-cols-2 gap-4 border-b border-[rgba(255,255,255,0.06)] pb-6">
                <div>
                    <span class="block text-xs text-gray-400 uppercase tracking-wider mb-1">Service</span>
                    <span class="text-lg font-bold text-white">${srv.name}</span>
                </div>
                <div>
                    <span class="block text-xs text-gray-400 uppercase tracking-wider mb-1">Price</span>
                    <span class="text-xl font-bold text-gold">${Utils.formatCurrency(srv.price)}</span>
                </div>
                <div>
                    <span class="block text-xs text-gray-400 uppercase tracking-wider mb-1">Barber</span>
                    <span class="text-lg text-white">${brb.name}</span>
                </div>
                <div>
                    <span class="block text-xs text-gray-400 uppercase tracking-wider mb-1">Duration</span>
                    <span class="text-lg text-gray-300">${srv.duration_minutes} min</span>
                </div>
            </div>
            
            <div class="grid grid-cols-2 gap-4 border-b border-[rgba(255,255,255,0.06)] pb-6">
                <div>
                    <span class="block text-xs text-gray-400 uppercase tracking-wider mb-1">Date</span>
                    <span class="text-lg text-white font-medium">${Utils.formatDate(state.selections.date)}</span>
                </div>
                <div>
                    <span class="block text-xs text-gray-400 uppercase tracking-wider mb-1">Time</span>
                    <span class="text-lg text-gold font-bold">${Utils.formatTime(start)}</span>
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <span class="block text-xs text-gray-400 uppercase tracking-wider mb-1">Name</span>
                    <span class="text-lg text-white">${c.name}</span>
                </div>
                <div>
                    <span class="block text-xs text-gray-400 uppercase tracking-wider mb-1">Phone</span>
                    <span class="text-lg text-white">${c.phone}</span>
                </div>
            </div>
        </div>
        <p class="text-sm text-gray-400 text-center mt-6">By confirming, you agree to our cancellation policy.</p>
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
