let servicesData = [];
let barbersData = [];

document.addEventListener('DOMContentLoaded', async () => {
    lucide.createIcons();
    
    try {
        servicesData = await API.getServices();
        barbersData = await API.getBarbers();
    } catch (e) {
        console.error("Failed to load services and barbers data");
    }

    document.getElementById('lookup-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const ref = document.getElementById('lookup-ref').value.trim().toUpperCase();
        const phone = document.getElementById('lookup-phone').value.trim();
        const btn = document.getElementById('btn-lookup');
        
        if (!ref || !phone) return;

        btn.disabled = true;
        btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin inline mr-2"></i> SEARCHING...`;
        lucide.createIcons();

        try {
            const data = await API.getAppointment(ref, phone);
            
            if (!data) {
                Utils.showToast('Appointment not found.', 'error');
                resetBtn(btn);
                return;
            }

            renderDetails(data);

        } catch (error) {
            Utils.showToast('Error finding appointment.', 'error');
            resetBtn(btn);
        }
    });
});

function resetBtn(btn) {
    btn.disabled = false;
    btn.textContent = 'FIND BOOKING';
}

function renderDetails(apt) {
    document.getElementById('lookup-view').classList.add('hidden');
    const view = document.getElementById('details-view');
    view.classList.remove('hidden');

    const isCancelled = apt.status === 'Cancelled';
    const statusColor = isCancelled ? 'text-red-500' : 'text-green-500';

    const service = servicesData.find(s => s.id === apt.service_id);
    const barber = barbersData.find(b => b.id === apt.barber_id);
    
    const serviceName = service ? service.name : apt.service_id;
    const barberName = barber ? barber.name : apt.barber_id;

    view.innerHTML = `
        <div class="flex justify-between items-start border-b border-charcoal pb-6 mb-6">
            <div>
                <h2 class="playfair text-3xl font-bold mb-1">Appointment Details</h2>
                <p class="font-mono text-gold">${apt.booking_reference}</p>
            </div>
            <div class="${statusColor} font-bold uppercase tracking-wider px-3 py-1 bg-charcoal rounded border ${isCancelled ? 'border-red-900' : 'border-green-900'}">
                ${apt.status}
            </div>
        </div>

        <div class="grid grid-cols-2 gap-y-6 gap-x-4 mb-8">
            <div>
                <span class="block text-xs text-gray-500 uppercase tracking-wider mb-1">Date</span>
                <span class="font-bold text-lg">${Utils.formatDate(apt.date)}</span>
            </div>
            <div>
                <span class="block text-xs text-gray-500 uppercase tracking-wider mb-1">Time</span>
                <span class="font-bold text-lg text-gold">${Utils.formatTime(apt.start_time)}</span>
            </div>
            <div>
                <span class="block text-xs text-gray-500 uppercase tracking-wider mb-1">Service</span>
                <span class="font-bold text-lg">${serviceName}</span>
            </div>
            <div>
                <span class="block text-xs text-gray-500 uppercase tracking-wider mb-1">Barber</span>
                <span class="font-bold text-lg">${barberName}</span>
            </div>
            <div>
                <span class="block text-xs text-gray-500 uppercase tracking-wider mb-1">Price</span>
                <span class="font-bold text-lg">${Utils.formatCurrency(apt.price)}</span>
            </div>
        </div>

        <div class="flex space-x-4">
            <button onclick="window.location.reload()" class="btn-outline">Back</button>
            ${!isCancelled ? `<button onclick="cancelApt('${apt.booking_reference}', '${apt.customer.phone}')" class="btn-outline text-red-500 border-red-500 hover:bg-red-900 hover:text-white" id="btn-cancel">CANCEL APPOINTMENT</button>` : ''}
        </div>
    `;
}

window.cancelApt = async (ref, phone) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    
    const btn = document.getElementById('btn-cancel');
    btn.disabled = true;
    btn.textContent = 'CANCELLING...';
    
    try {
        await API.cancelAppointment(ref, phone);
        Utils.showToast('Appointment cancelled successfully.');
        setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
        Utils.showToast(e.message, 'error');
        btn.disabled = false;
        btn.textContent = 'CANCEL APPOINTMENT';
    }
};
