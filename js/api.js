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
        return await API.request('GET', action);
    },

    post: async (action, payload) => {
        return await API.request('POST', action, payload);
    },

    // Specific endpoints
    getSettings: () => API.get('getSettings'),
    getServices: () => API.get('getServices'),
    getBarbers: () => API.get('getBarbers'),
    getAvailability: (barberId, date, serviceId) => API.get(`getAvailability&barber_id=${barberId}&date=${date}&service_id=${serviceId}`),
    getAppointment: (reference, phone) => API.get(`getAppointment&reference=${reference}&phone=${phone}`),
    
    createAppointment: (data) => API.post('createAppointment', data),
    cancelAppointment: (reference, phone) => API.post('cancelAppointment', { reference, phone })
};
