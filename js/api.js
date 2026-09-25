const API = {
    request: async (method, action, payload = null) => {
        let url = `${CONFIG.API_URL}?action=${action}`;
        
        let options = {
            method: method,
            headers: {} // GAS doesn't require specific headers for basic forms, but we use Content-Type text/plain to avoid CORS preflight issues sometimes, but POST json is better.
        };

        if (method === 'POST') {
            options.body = JSON.stringify({ action, payload });
            // By default GAS doesn't like application/json with CORS. 
            // So we send plain text that we parse on the server.
            options.headers['Content-Type'] = 'text/plain;charset=utf-8';
        }

        try {
            const response = await fetch(url, options);
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message || result.error || 'API Request failed');
            }
            
            return result.data;
        } catch (error) {
            console.error(`API Error (${action}):`, error);
            throw error;
        }
    },

    get: async (action) => {
        const cacheKey = `barber_cache_${action}`;
        const cachedData = localStorage.getItem(cacheKey);
        const cacheExpiry = localStorage.getItem(`${cacheKey}_expiry`);

        // Use cache if it exists and hasn't expired (e.g., 60 minutes TTL)
        if (cachedData && cacheExpiry && Date.now() < parseInt(cacheExpiry, 10)) {
            try {
                return JSON.parse(cachedData);
            } catch (e) {
                console.warn('Cache parsing failed, fetching fresh data');
            }
        }

        // Fetch fresh data
        const data = await API.request('GET', action);
        
        // Cache the result
        localStorage.setItem(cacheKey, JSON.stringify(data));
        localStorage.setItem(`${cacheKey}_expiry`, Date.now() + 60 * 60 * 1000); // 60 minutes
        
        return data;
    },

    post: async (action, payload) => {
        // Clear all cache to avoid stale data
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('barber_cache_')) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        return await API.request('POST', action, payload);
    },

    // Specific endpoints
    getSettings: () => API.get('getSettings'),
    getServices: () => API.get('getServices'),
    getBarbers: () => API.get('getBarbers'),
    getAvailability: (barberId, date, serviceId) => API.request('GET', `getAvailability&barber_id=${barberId}&date=${date}&service_id=${serviceId}`),
    getAppointment: (reference, phone) => API.request('GET', `getAppointment&reference=${reference}&phone=${phone}`),
    
    createAppointment: (data) => API.post('createAppointment', data),
    cancelAppointment: (reference, phone) => API.post('cancelAppointment', { reference, phone })
};
