const Utils = {
    formatCurrency: (amount, currency = 'USD') => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(amount);
    },

    formatDate: (dateString) => {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const [y, m, d] = dateString.split('-');
        return new Date(y, m - 1, d).toLocaleDateString('en-US', options);
    },

    formatTime: (timeString) => {
        // timeString is "HH:MM"
        if (!timeString) return '';
        const [h, m] = timeString.split(':');
        let hours = parseInt(h, 10);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; 
        return `${hours}:${m} ${ampm}`;
    },

    showToast: (message, type = 'success') => {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `${type === 'success' ? '✓' : '✕'} ${message}`;
        
        container.appendChild(toast);

        // trigger reflow
        void toast.offsetWidth;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    showModal: (modalId) => {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('active');
    },

    hideModal: (modalId) => {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('active');
    },

    generateICS: (appointment) => {
        // appointment: { date, start_time, end_time, service_name, barber_name, address }
        const { date, start_time, end_time, service_name, barber_name, address } = appointment;
        
        const formatDateForICS = (d, t) => {
            const dt = new Date(`${d}T${t}`);
            return dt.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        };

        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'BEGIN:VEVENT',
            `DTSTART:${formatDateForICS(date, start_time)}`,
            `DTEND:${formatDateForICS(date, end_time)}`,
            `SUMMARY:Haircut Appointment - ${service_name}`,
            `DESCRIPTION:Appointment with ${barber_name} for ${service_name}.`,
            `LOCATION:${address}`,
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\n');

        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'appointment.ics';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};
