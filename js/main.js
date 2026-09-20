document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide icons
    if (window.lucide) {
        lucide.createIcons();
    }

    // Set current year in footer
    const yearEl = document.getElementById('current-year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // Mobile menu toggle
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileBtn && mobileMenu) {
        mobileBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // Load home page data if elements exist
    if (document.getElementById('services-grid')) {
        loadHomeData();
    }
});

async function loadHomeData() {
    try {
        // Fetch settings, services, and barbers in parallel
        const [settings, services, barbers] = await Promise.all([
            API.getSettings(),
            API.getServices(),
            API.getBarbers()
        ]);

        updateContactInfo(settings);
        renderServices(services);
        renderBarbers(barbers);

    } catch (error) {
        console.error("Failed to load home data:", error);
        
        const sl = document.getElementById('services-loading');
        if(sl) sl.textContent = "Unable to load data. Please try again later.";
        
        const bl = document.getElementById('barbers-loading');
        if(bl) bl.textContent = "Unable to load data. Please try again later.";
    }
}

function updateContactInfo(settings) {
    const bName = settings.business_name || 'THE BARBER';
    document.title = bName;
    document.getElementById('nav-brand').textContent = bName;
    document.getElementById('footer-brand').textContent = bName;

    const addrEl = document.getElementById('contact-address');
    if (addrEl) addrEl.textContent = settings.address;

    const phoneEl = document.getElementById('contact-phone');
    if (phoneEl) phoneEl.textContent = settings.phone;

    const emailEl = document.getElementById('contact-email');
    if (emailEl) emailEl.textContent = settings.email;

    const mapLink = document.getElementById('contact-map-link');
    if (mapLink && settings.google_maps_url) {
        mapLink.href = settings.google_maps_url;
    }
}

function renderServices(services) {
    const grid = document.getElementById('services-grid');
    const loading = document.getElementById('services-loading');
    const errorEl = document.getElementById('services-error');
    
    if (!grid || !loading) return;
    
    if (!services || services.length === 0) {
        loading.innerHTML = '<p>No services found.</p>';
        return;
    }

    grid.innerHTML = services.map(service => `
        <div class="bg-[#151515] border border-charcoal p-8 rounded-lg hover:border-gold transition-all duration-300 flex flex-col h-full text-left">
            <div class="flex justify-between items-start mb-3">
                <h4 class="playfair text-2xl font-bold">${service.name}</h4>
                <span class="bg-charcoal border border-gray-800 text-xs text-gray-400 px-2 py-1 rounded uppercase tracking-wider">${service.category}</span>
            </div>
            <p class="text-gray-400 mb-6 flex-grow">${service.description}</p>
            <div class="flex justify-between items-center mb-6">
                <span class="text-gold font-bold text-xl">${Utils.formatCurrency(service.price)}</span>
                <span class="text-gray-500 text-sm flex items-center gap-1"><i data-lucide="clock" class="w-4 h-4"></i> ${service.duration_minutes} MIN</span>
            </div>
            <a href="booking.html?service=${service.id}" class="btn-primary w-full text-center">BOOK APPOINTMENT</a>
        </div>
    `).join('');
    
    if (window.lucide) {
        lucide.createIcons();
    }
    loading.classList.add('hidden');
    grid.classList.remove('hidden');
}

function renderBarbers(barbers) {
    const loading = document.getElementById('barbers-loading');
    const grid = document.getElementById('barbers-grid');
    const errorEl = document.getElementById('barbers-error');

    if (!grid || !loading) return;

    if (!barbers || barbers.length === 0) {
        loading.innerHTML = '<p>No barbers found.</p>';
        return;
    }

    grid.innerHTML = barbers.map(barber => {
        const imgUrl = barber.image_url || 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&q=80&w=600';
        
        return `
        <div class="bg-[#151515] border border-charcoal rounded-lg overflow-hidden hover:border-gold transition-all duration-300 flex flex-col h-full">
            <div class="h-64 overflow-hidden relative">
                <img src="${imgUrl}" alt="${barber.name}" class="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500">
                <div class="absolute bottom-0 left-0 w-full bg-gradient-to-t from-[#151515] to-transparent h-24"></div>
            </div>
            <div class="p-8 flex-grow flex flex-col">
                <h4 class="playfair text-3xl font-bold mb-1">${barber.name}</h4>
                <p class="text-gold font-medium mb-4 uppercase tracking-widest text-xs">${barber.experience} Experience</p>
                
                <p class="text-gray-400 mb-6 flex-grow">${barber.bio}</p>
                
                <div class="mb-6 pb-6 border-b border-charcoal">
                    <span class="block text-xs text-gray-500 uppercase tracking-wider mb-2">Specialties</span>
                    <p class="text-sm">${barber.specialty}</p>
                </div>
                
                <a href="booking.html?barber=${barber.id}" class="btn-outline w-full text-center">BOOK WITH ${barber.name.toUpperCase().split(' ')[0]}</a>
            </div>
        </div>
        `;
    }).join('');

    if (window.lucide) {
        lucide.createIcons();
    }
    loading.classList.add('hidden');
    grid.classList.remove('hidden');
}
