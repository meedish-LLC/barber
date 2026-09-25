const SHEETS_CONFIG = {
  SETTINGS: {
    name: 'Settings',
    headers: ['key', 'value'],
    defaultData: [
      ['business_name', 'The Premium Barbershop'],
      ['address', '123 Grooming Street, NY 10001'],
      ['phone', '+1 (555) 123-4567'],
      ['email', 'hello@premiumbarbershop.com'],
      ['timezone', 'Africa/Addis_Ababa'],
      ['currency', 'USD'],
      ['booking_interval', '30'], // Minutes
      ['cancellation_hours', '24'],
      ['google_maps_url', 'https://maps.google.com'],
      ['instagram_url', 'https://instagram.com'],
      ['facebook_url', 'https://facebook.com']
    ]
  },
  SERVICES: {
    name: 'Services',
    headers: ['id', 'name', 'description', 'category', 'price', 'duration_minutes', 'image_url', 'active', 'created_at', 'updated_at'],
    defaultData: [
      ['srv_1', 'Classic Haircut', 'Precision haircut finished with professional styling.', 'Hair', '25', '30', '', 'TRUE', new Date().toISOString(), new Date().toISOString()],
      ['srv_2', 'Skin Fade', 'Expert skin fade tailored to your head shape.', 'Hair', '30', '45', '', 'TRUE', new Date().toISOString(), new Date().toISOString()],
      ['srv_3', 'Beard Trim', 'Detailed beard shaping and line-up.', 'Beard', '15', '15', '', 'TRUE', new Date().toISOString(), new Date().toISOString()],
      ['srv_4', 'Haircut + Beard', 'Full grooming experience.', 'Combo', '35', '45', '', 'TRUE', new Date().toISOString(), new Date().toISOString()],
      ['srv_5', 'Premium Grooming', 'Haircut, beard trim, hot towel, and facial.', 'Combo', '55', '60', '', 'TRUE', new Date().toISOString(), new Date().toISOString()]
    ]
  },
  BARBERS: {
    name: 'Barbers',
    headers: ['id', 'name', 'bio', 'specialty', 'experience', 'image_url', 'phone', 'email', 'weekly_day_off', 'active', 'created_at', 'updated_at'],
    defaultData: [
      ['barber_1', 'John Carter', 'Master barber with a passion for classic cuts.', 'Classic cuts • Fades', '5+ Years', '', '555-0001', 'john@example.com', '7', 'TRUE', new Date().toISOString(), new Date().toISOString()],
      ['barber_2', 'Michael Davis', 'Expert in modern styles and beard shaping.', 'Modern styling', '3 Years', '', '555-0002', 'michael@example.com', '7', 'TRUE', new Date().toISOString(), new Date().toISOString()],
      ['barber_3', 'David Wilson', 'Specialist in skin fades and hot towel shaves.', 'Fades • Hot Towel', '7 Years', '', '555-0003', 'david@example.com', '7', 'TRUE', new Date().toISOString(), new Date().toISOString()]
    ]
  },
  WORKING_HOURS: {
    name: 'WorkingHours',
    headers: ['id', 'barber_id', 'day_of_week', 'start_time', 'end_time', 'break_start', 'break_end', 'active'],
    defaultData: [
      // Monday (1) to Friday (5) for John
      ['wh_1', 'barber_1', '1', '09:00', '18:00', '13:00', '14:00', 'TRUE'],
      ['wh_2', 'barber_1', '2', '09:00', '18:00', '13:00', '14:00', 'TRUE'],
      ['wh_3', 'barber_1', '3', '09:00', '18:00', '13:00', '14:00', 'TRUE'],
      ['wh_4', 'barber_1', '4', '09:00', '18:00', '13:00', '14:00', 'TRUE'],
      ['wh_5', 'barber_1', '5', '09:00', '18:00', '13:00', '14:00', 'TRUE'],
      
      // Michael
      ['wh_6', 'barber_2', '1', '10:00', '19:00', '14:00', '15:00', 'TRUE'],
      ['wh_7', 'barber_2', '2', '10:00', '19:00', '14:00', '15:00', 'TRUE'],
      ['wh_8', 'barber_2', '3', '10:00', '19:00', '14:00', '15:00', 'TRUE'],
      ['wh_9', 'barber_2', '4', '10:00', '19:00', '14:00', '15:00', 'TRUE'],
      ['wh_10', 'barber_2', '5', '10:00', '19:00', '14:00', '15:00', 'TRUE'],

      // David
      ['wh_11', 'barber_3', '1', '08:00', '17:00', '12:00', '13:00', 'TRUE'],
      ['wh_12', 'barber_3', '2', '08:00', '17:00', '12:00', '13:00', 'TRUE'],
      ['wh_13', 'barber_3', '3', '08:00', '17:00', '12:00', '13:00', 'TRUE'],
      ['wh_14', 'barber_3', '4', '08:00', '17:00', '12:00', '13:00', 'TRUE'],
      ['wh_15', 'barber_3', '5', '08:00', '17:00', '12:00', '13:00', 'TRUE'],
    ]
  },
  DAYS_OFF: {
    name: 'DaysOff',
    headers: ['id', 'barber_id', 'date', 'reason', 'created_at'],
    defaultData: []
  },
  BLOCKED_SLOTS: {
    name: 'BlockedSlots',
    headers: ['id', 'barber_id', 'date', 'start_time', 'end_time', 'reason', 'created_at'],
    defaultData: []
  },
  CUSTOMERS: {
    name: 'Customers',
    headers: ['id', 'name', 'phone', 'email', 'notes', 'created_at', 'updated_at'],
    defaultData: []
  },
  APPOINTMENTS: {
    name: 'Appointments',
    headers: ['id', 'booking_reference', 'customer_id', 'barber_id', 'service_id', 'date', 'start_time', 'end_time', 'status', 'price', 'customer_notes', 'created_at', 'updated_at', 'cancelled_at'],
    defaultData: []
  },
  ADMIN_USERS: {
    name: 'AdminUsers',
    headers: ['id', 'email', 'name', 'role', 'active'],
    defaultData: [
      ['admin_1', 'admin@example.com', 'System Admin', 'owner', 'TRUE']
    ]
  }
};

/**
 * Run this function from the Apps Script editor to initialize the spreadsheet.
 */
function setupSpreadsheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  for (const key in SHEETS_CONFIG) {
    const config = SHEETS_CONFIG[key];
    let sheet = ss.getSheetByName(config.name);
    
    if (!sheet) {
      sheet = ss.insertSheet(config.name);
      // Add headers
      sheet.appendRow(config.headers);
      
      // Style headers
      const headerRange = sheet.getRange(1, 1, 1, config.headers.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#f3f4f6');
      
      // Add default data
      if (config.defaultData && config.defaultData.length > 0) {
        sheet.getRange(2, 1, config.defaultData.length, config.defaultData[0].length).setValues(config.defaultData);
      }
      
      // Auto resize columns
      for (let i = 1; i <= config.headers.length; i++) {
        sheet.autoResizeColumn(i);
      }
      
      Logger.log('Created sheet: ' + config.name);
    } else {
      Logger.log('Sheet already exists: ' + config.name);
      // Check for missing headers and append them
      const existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const missingHeaders = config.headers.filter(h => !existingHeaders.includes(h));
      if (missingHeaders.length > 0) {
        const startCol = existingHeaders.length + 1;
        sheet.getRange(1, startCol, 1, missingHeaders.length).setValues([missingHeaders]);
        const headerRange = sheet.getRange(1, startCol, 1, missingHeaders.length);
        headerRange.setFontWeight('bold');
        headerRange.setBackground('#f3f4f6');
        Logger.log('Added missing headers to ' + config.name + ': ' + missingHeaders.join(', '));
      }
    }
  }
}
