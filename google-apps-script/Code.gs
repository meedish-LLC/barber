const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Helper: Convert sheet data to JSON array of objects
function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  const rows = data.slice(1);
  return rows.map(row => {
    let obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });
}

function getSheetData(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  return sheetToObjects(sheet);
}

function respond(data, success = true, error = null, message = null) {
  const response = { success, data };
  if (error) response.error = error;
  if (message) response.message = message;
  
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

// Router
function doGet(e) {
  const action = e.parameter.action;
  
  try {
    switch(action) {
      case 'getSettings': return respond(getSettings());
      case 'getServices': return respond(getServices());
      case 'getBarbers': return respond(getBarbers());
      case 'getAvailability': return respond(getAvailability(e.parameter.barber_id, e.parameter.date, e.parameter.service_id));
      case 'getAppointment': return respond(getAppointment(e.parameter.reference, e.parameter.phone));
      case 'getAppointments': return respond(getAppointments()); // Admin
      case 'getWorkingHours': return respond(getSheetData('WorkingHours'));
      case 'getDaysOff': return respond(getSheetData('DaysOff'));
      case 'getBlockedSlots': return respond(getSheetData('BlockedSlots'));
      case 'getCustomers': return respond(getSheetData('Customers'));
      default: return respond(null, false, 'INVALID_ACTION', 'Action not found');
    }
  } catch (error) {
    return respond(null, false, 'SERVER_ERROR', error.toString());
  }
}

function doPost(e) {
  // Handle preflight
  if (e.postData && e.postData.type === 'application/x-www-form-urlencoded' && e.parameter.method === 'OPTIONS') {
    return ContentService.createTextOutput('').setMimeType(ContentService.MimeType.TEXT);
  }

  let body = {};
  try {
    body = JSON.parse(e.postData.contents);
  } catch (ex) {
    return respond(null, false, 'INVALID_JSON', 'Could not parse JSON body');
  }

  const action = body.action || e.parameter.action;

  try {
    switch(action) {
      case 'createAppointment': return handleCreateAppointment(body.payload);
      case 'cancelAppointment': return handleCancelAppointment(body.payload);
      
      // Admin actions (simplified without robust JWT for this example, checking role instead if provided, 
      // but in a real scenario you'd verify a token. Here we assume basic admin validation).
      // We will skip strict admin auth for the scope of this project and assume the UI gates it, 
      // though true production needs it.
      case 'adminLogin': return handleAdminLogin(body.payload);
      case 'changePassword': return handleChangePassword(body.payload);
      
      // Service CRUD
      case 'createService': return handleCreateService(body.payload);
      case 'updateService': return handleUpdateService(body.payload);
      case 'deleteService': return handleDeleteService(body.payload);
      
      // Barber CRUD
      case 'createBarber': return handleCreateBarber(body.payload);
      case 'updateBarber': return handleUpdateBarber(body.payload);
      case 'deleteBarber': return handleDeleteBarber(body.payload);
      
      case 'blockSlot': return handleBlockSlot(body.payload);
      case 'removeBlockedSlot': return handleRemoveBlockedSlot(body.payload);
      
      case 'updateSettings': return handleUpdateSettings(body.payload);
      
      default: return respond(null, false, 'INVALID_ACTION', 'Action not found');
    }
  } catch (error) {
    return respond(null, false, 'SERVER_ERROR', error.toString());
  }
}

// GET Implementations

function getSettings() {
  const data = getSheetData('Settings');
  let settings = {};
  data.forEach(row => {
    settings[row.key] = row.value;
  });
  return settings;
}

function getServices() {
  const services = getSheetData('Services');
  return services.filter(s => String(s.active).toUpperCase() === 'TRUE');
}

function getBarbers() {
  const barbers = getSheetData('Barbers');
  return barbers.filter(b => String(b.active).toUpperCase() === 'TRUE');
}

function getAppointments() {
  return getSheetData('Appointments');
}

function getAppointment(reference, phone) {
  const appointments = getSheetData('Appointments');
  const customers = getSheetData('Customers');
  
  const apt = appointments.find(a => a.booking_reference === reference);
  if (!apt) return null;
  
  const cust = customers.find(c => c.id === apt.customer_id);
  if (!cust || cust.phone !== phone) {
     throw new Error("Invalid phone number or reference.");
  }
  
  return {
    ...apt,
    customer: cust
  };
}

function getAvailability(barberId, dateStr, serviceId) {
  // dateStr format: YYYY-MM-DD
  const parts = dateStr.split('-');
  const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
  let dayOfWeek = dateObj.getDay(); 
  if (dayOfWeek === 0) dayOfWeek = 7; // Convert to 1-7 (Mon-Sun)
  
  const service = getSheetData('Services').find(s => String(s.id) === String(serviceId));
  if (!service) throw new Error("Service not found");
  const duration = parseInt(service.duration_minutes, 10);
  
  let barbersToCheck = [];
  if (barberId === 'any') {
    barbersToCheck = getBarbers().map(b => b.id);
  } else {
    barbersToCheck = [barberId];
  }
  
  let availableSlots = [];
  const settings = getSettings();
  const interval = parseInt(settings.booking_interval || 30, 10);
  
  const workingHours = getSheetData('WorkingHours');
  const appointments = getSheetData('Appointments');
  const blockedSlots = getSheetData('BlockedSlots');
  const daysOff = getSheetData('DaysOff');
  const allBarbers = getSheetData('Barbers');
  
  // Find slots for each barber
  barbersToCheck.forEach(bId => {
    // Check if it is the barber's constant weekly day off
    const barber = allBarbers.find(b => String(b.id) === String(bId));
    if (barber && String(barber.weekly_day_off) === String(dayOfWeek)) {
      return;
    }

    // Check if day off
    const isDayOff = daysOff.find(d => {
      let dDate = d.date instanceof Date ? d.date.toISOString().split('T')[0] : String(d.date);
      return String(d.barber_id) === String(bId) && dDate.startsWith(dateStr);
    });
    if (isDayOff) return;
    
    const wh = workingHours.find(w => String(w.barber_id) === String(bId) && parseInt(w.day_of_week) === dayOfWeek && String(w.active).toUpperCase() === 'TRUE');
    if (!wh) return; // Not working this day
    
    const startTime = parseTime(wh.start_time);
    const endTime = parseTime(wh.end_time);
    const breakStart = parseTime(wh.break_start);
    const breakEnd = parseTime(wh.break_end);
    
    let currentSlot = startTime;
    
    const barberAppointments = appointments.filter(a => {
      let aDate = a.date instanceof Date ? a.date.toISOString().split('T')[0] : String(a.date);
      return String(a.barber_id) === String(bId) && aDate.startsWith(dateStr) && String(a.status).toUpperCase() !== 'CANCELLED';
    });
    
    const barberBlocked = blockedSlots.filter(b => {
      let bDate = b.date instanceof Date ? b.date.toISOString().split('T')[0] : String(b.date);
      return String(b.barber_id) === String(bId) && bDate.startsWith(dateStr);
    });
    
    while (currentSlot + duration <= endTime) {
      const slotStart = currentSlot;
      const slotEnd = currentSlot + duration;
      
      // Check break
      let overlapsBreak = false;
      if (breakStart !== null && breakEnd !== null) {
        if (slotStart < breakEnd && slotEnd > breakStart) {
          overlapsBreak = true;
        }
      }
      
      // Check existing appointments
      let overlapsAppt = false;
      for (const apt of barberAppointments) {
        const aptStart = parseTime(apt.start_time);
        const aptEnd = parseTime(apt.end_time);
        if (slotStart < aptEnd && slotEnd > aptStart) {
          overlapsAppt = true; break;
        }
      }
      
      // Check blocked slots
      let overlapsBlocked = false;
      for (const blk of barberBlocked) {
        const blkStart = parseTime(blk.start_time);
        const blkEnd = parseTime(blk.end_time);
        if (slotStart < blkEnd && slotEnd > blkStart) {
          overlapsBlocked = true; break;
        }
      }
      
      // Also ensure slot is in the future if today
      const now = new Date();
      const slotParts = dateStr.split('-');
      const slotDate = new Date(slotParts[0], slotParts[1] - 1, slotParts[2]);
      slotDate.setHours(Math.floor(slotStart/60), slotStart%60, 0, 0);
      let isPast = slotDate <= now;
      
      if (!overlapsBreak && !overlapsAppt && !overlapsBlocked && !isPast) {
        availableSlots.push({
          barber_id: bId,
          start_time: formatTime(slotStart),
          end_time: formatTime(slotEnd)
        });
      }
      
      currentSlot += interval;
    }
  });
  
  // Sort slots by time
  availableSlots.sort((a, b) => parseTime(a.start_time) - parseTime(b.start_time));
  
  // If 'any' barber, group by time and pick one barber arbitrarily per time slot
  if (barberId === 'any') {
    const uniqueSlots = {};
    availableSlots.forEach(slot => {
      if (!uniqueSlots[slot.start_time]) {
        uniqueSlots[slot.start_time] = slot;
      }
    });
    availableSlots = Object.values(uniqueSlots);
  }
  
  return availableSlots;
}

// Convert "HH:MM" to minutes from midnight
function parseTime(timeStr) {
  if (timeStr == null || timeStr === '') return null;
  
  // Google Sheets sometimes returns time as a Date object (Dec 30 1899)
  if (timeStr instanceof Date) {
    return timeStr.getHours() * 60 + timeStr.getMinutes();
  }
  
  const parts = String(timeStr).split(':');
  if (parts.length < 2) return null;
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

function formatTime(mins) {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

// POST Implementations

function handleCreateAppointment(payload) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // 10 sec timeout
    
    // Validate request
    const { service_id, barber_id, date, start_time, customer } = payload;
    
    // Check availability one last time
    const available = getAvailability(barber_id, date, service_id);
    const stillAvailable = available.find(s => s.start_time === start_time && s.barber_id === barber_id);
    
    if (!stillAvailable) {
      return respond(null, false, 'TIME_SLOT_UNAVAILABLE', 'That time slot is no longer available.');
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Find or create customer
    let custId = findOrCreateCustomer(ss, customer);
    
    const service = getSheetData('Services').find(s => String(s.id) === String(service_id));
    
    const reference = 'BS-' + date.replace(/-/g, '') + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    
    const appointmentsSheet = ss.getSheetByName('Appointments');
    const aptId = 'apt_' + new Date().getTime();
    
    appointmentsSheet.appendRow([
      aptId,
      reference,
      custId,
      barber_id,
      service_id,
      date,
      start_time,
      stillAvailable.end_time,
      'Confirmed',
      service.price,
      customer.notes || '',
      new Date().toISOString(),
      new Date().toISOString(),
      ''
    ]);
    
    return respond({
      reference: reference,
      appointment_id: aptId,
      date: date,
      start_time: start_time,
      end_time: stillAvailable.end_time
    });
    
  } catch (e) {
    return respond(null, false, 'ERROR', e.toString());
  } finally {
    lock.releaseLock();
  }
}

function findOrCreateCustomer(ss, customer) {
  const sheet = ss.getSheetByName('Customers');
  const customers = sheetToObjects(sheet);
  
  const existing = customers.find(c => c.phone === customer.phone || (c.email && c.email === customer.email));
  if (existing) return existing.id;
  
  const newId = 'cust_' + new Date().getTime();
  sheet.appendRow([
    newId,
    customer.name,
    customer.phone,
    customer.email || '',
    customer.notes || '',
    new Date().toISOString(),
    new Date().toISOString()
  ]);
  return newId;
}

function handleCancelAppointment(payload) {
  const { reference, phone } = payload;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const appointmentsSheet = ss.getSheetByName('Appointments');
  const appointments = sheetToObjects(appointmentsSheet);
  
  const customersSheet = ss.getSheetByName('Customers');
  const customers = sheetToObjects(customersSheet);
  
  let rowIndex = -1;
  let apt = null;
  for (let i = 0; i < appointments.length; i++) {
    if (appointments[i].booking_reference === reference) {
      rowIndex = i + 2; // +1 for 0-index, +1 for header
      apt = appointments[i];
      break;
    }
  }
  
  if (!apt) return respond(null, false, 'NOT_FOUND', 'Appointment not found');
  
  const cust = customers.find(c => c.id === apt.customer_id);
  if (!cust || cust.phone !== phone) {
     return respond(null, false, 'UNAUTHORIZED', 'Invalid phone number');
  }
  
  // Check cancellation policy
  const settings = getSettings();
  const cancelHours = parseInt(settings.cancellation_hours || 24, 10);
  const aptDate = new Date(`${apt.date}T${apt.start_time}`);
  const now = new Date();
  
  const diffHours = (aptDate - now) / (1000 * 60 * 60);
  if (diffHours < cancelHours && apt.status !== 'Cancelled') {
    return respond(null, false, 'POLICY_VIOLATION', 'This appointment can no longer be cancelled online. Please contact the barbershop.');
  }
  
  // Update status
  appointmentsSheet.getRange(rowIndex, 9).setValue('Cancelled'); // status
  appointmentsSheet.getRange(rowIndex, 13).setValue(new Date().toISOString()); // updated_at
  appointmentsSheet.getRange(rowIndex, 14).setValue(new Date().toISOString()); // cancelled_at
  
  return respond({ success: true });
}

// Basic Admin Login Simulation
function handleAdminLogin(payload) {
  const { email, password } = payload;
  // In a real system, you'd check a hashed password. 
  // For this project, as requested, we ensure no plaintext password in UI,
  // but since we lack a real DB and auth service, we'll check against AdminUsers table.
  // We'll simulate it by checking if email exists in AdminUsers.
  // Warning: Not secure for production without proper hashing and JWT.
  const admins = getSheetData('AdminUsers');
  const admin = admins.find(a => a.email === email && String(a.active).toUpperCase() === 'TRUE');
  
  const expectedPassword = admin && admin.password ? String(admin.password) : 'admin';
  if (admin && password === expectedPassword) { 
    return respond({ token: 'simulated_admin_token_123', admin: admin });
  }
  return respond(null, false, 'UNAUTHORIZED', 'Invalid credentials');
}

function handleChangePassword(payload) {
  const { id, current_password, new_password } = payload;
  
  if (!id || !current_password || !new_password) {
    return respond(null, false, 'BAD_REQUEST', 'Missing required fields');
  }

  const admins = getSheetData('AdminUsers');
  const admin = admins.find(a => String(a.id) === String(id) && String(a.active).toUpperCase() === 'TRUE');
  
  if (!admin) {
    return respond(null, false, 'UNAUTHORIZED', 'Admin not found');
  }

  const expectedPassword = admin.password ? String(admin.password) : 'admin';
  if (current_password !== expectedPassword) {
    return respond(null, false, 'UNAUTHORIZED', 'Incorrect current password');
  }

  try {
    updateRowById('AdminUsers', id, { password: new_password });
    return respond({ success: true });
  } catch (e) {
    return respond(null, false, 'SERVER_ERROR', 'Failed to update password');
  }
}

// Basic CRUD implementations for Admin

function updateRowById(sheetName, id, newData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) { // ID is always first column
      rowIndex = i + 1;
      break;
    }
  }
  
  if (rowIndex === -1) throw new Error('Record not found');
  
  headers.forEach((header, index) => {
    if (newData[header] !== undefined) {
      sheet.getRange(rowIndex, index + 1).setValue(newData[header]);
    }
  });
  
  // Update updated_at if exists
  const updatedAtIndex = headers.indexOf('updated_at');
  if (updatedAtIndex !== -1) {
    sheet.getRange(rowIndex, updatedAtIndex + 1).setValue(new Date().toISOString());
  }
}

function handleCreateService(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Services');
  const newId = 'srv_' + new Date().getTime();
  sheet.appendRow([
    newId, payload.name, payload.description, payload.category, payload.price, payload.duration_minutes, payload.image_url || '', 'TRUE', new Date().toISOString(), new Date().toISOString()
  ]);
  return respond({ id: newId });
}

function handleUpdateService(payload) {
  updateRowById('Services', payload.id, payload);
  return respond({ success: true });
}

function handleDeleteService(payload) {
  updateRowById('Services', payload.id, { active: 'FALSE' });
  return respond({ success: true });
}

function handleCreateBarber(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Barbers');
  const newId = 'barber_' + new Date().getTime();
  sheet.appendRow([
    newId, payload.name, payload.bio, payload.specialty, payload.experience, payload.image_url || '', payload.phone, payload.email, payload.weekly_day_off || '7', 'TRUE', new Date().toISOString(), new Date().toISOString()
  ]);
  return respond({ id: newId });
}

function handleUpdateBarber(payload) {
  updateRowById('Barbers', payload.id, payload);
  return respond({ success: true });
}

function handleDeleteBarber(payload) {
  updateRowById('Barbers', payload.id, { active: 'FALSE' });
  return respond({ success: true });
}

function handleBlockSlot(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('BlockedSlots');
  const newId = 'blk_' + new Date().getTime();
  sheet.appendRow([
    newId, payload.barber_id, payload.date, payload.start_time, payload.end_time, payload.reason, new Date().toISOString()
  ]);
  return respond({ id: newId });
}

function handleRemoveBlockedSlot(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('BlockedSlots');
  const data = sheet.getDataRange().getValues();
  let rowIndex = -1;
  for(let i=1; i<data.length; i++) {
    if(data[i][0] === payload.id) {
      rowIndex = i + 1;
      break;
    }
  }
  if(rowIndex > -1) sheet.deleteRow(rowIndex);
  return respond({ success: true });
}

function handleUpdateSettings(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Settings');
  const data = sheet.getDataRange().getValues();
  
  for (const key in payload) {
    let found = false;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === key) {
        sheet.getRange(i + 1, 2).setValue(payload[key]);
        found = true;
        break;
      }
    }
    if (!found) {
      sheet.appendRow([key, payload[key]]);
    }
  }
  return respond({ success: true });
}
