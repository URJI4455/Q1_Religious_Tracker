// STATE MANAGEMENT & CONSTANTS
const STORAGE_KEY = 'q1ReligiousTrackerRecords';
// Q1 Start Date mapped to Gregorian (2019 E.C. New Year is Sep 11, 2026)
const Q1_START_DATE = '2026-09-11';
let records = [];

// DOM ELEMENTS
const els = {
    // Dashboard
    quranTotalPages: document.getElementById('quranTotalPages'),
    quranCurrentJuz: document.getElementById('quranCurrentJuz'),
    quranTrajectory: document.getElementById('quranTrajectory'),
    zikrTotal: document.getElementById('zikrTotal'),
    zikrAverage: document.getElementById('zikrAverage'),
    zikrTrajectory: document.getElementById('zikrTrajectory'),
    sawmTotal: document.getElementById('sawmTotal'),
    
    // Form
    form: document.getElementById('dailyForm'),
    dateInput: document.getElementById('dateInput'),
    quranInput: document.getElementById('quranInput'),
    salawatInput: document.getElementById('salawatInput'),
    subhanAllahInput: document.getElementById('subhanAllahInput'),
    istighfarInput: document.getElementById('istighfarInput'),
    sawmInput: document.getElementById('sawmInput'),
    notesInput: document.getElementById('notesInput'),
    submitBtn: document.getElementById('submitBtn'),
    fillBaselineBtn: document.getElementById('fillBaselineBtn'),
    steppers: document.querySelectorAll('.btn-stepper'),
    
    // History & Actions
    historyContainer: document.getElementById('historyContainer'),
    resetBtn: document.getElementById('resetAllBtn'),
    
    // Drawer
    drawer: document.getElementById('sopDrawer'),
    openSopBtn: document.getElementById('openSopBtn'),
    closeSopBtn: document.getElementById('closeSopBtn'),
    drawerBackdrop: document.getElementById('drawerBackdrop')
};

// INITIALIZATION
function init() {
    loadRecords();
    setDefaultDate();
    updateDashboard();
    renderHistory();
    attachEventListeners();
}

function loadRecords() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                records = parsed;
            }
        }
    } catch (e) {
        console.error("Local storage parsing error:", e);
        records = [];
    }
}

function saveRecords() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function setDefaultDate() {
    const today = new Date();
    // Format YYYY-MM-DD avoiding timezone shifts
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    els.dateInput.value = `${yyyy}-${mm}-${dd}`;
}

// CALCULATIONS
function getDaysElapsed() {
    const today = new Date();
    const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const start = new Date(2026, 8, 11); // Sept 11, 2026
    
    const diffTime = current - start;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    // Cap strictly within reasonable Q1 bounds or return 1 if before start to prevent div by zero
    if (diffDays < 1) return 1; 
    if (diffDays > 90) return 90; // Approx 3 months
    return diffDays;
}

function updateDashboard() {
    const daysElapsed = getDaysElapsed();
    
    // Qur'an
    const totalPages = records.reduce((sum, r) => sum + r.quranPages, 0);
    const currentJuz = totalPages / 20;
    
    els.quranTotalPages.textContent = totalPages;
    els.quranCurrentJuz.textContent = Number(currentJuz.toFixed(2));
    
    // Zikr
    const totalZikr = records.reduce((sum, r) => sum + r.zikrTotal, 0);
    const zikrAvg = totalZikr / daysElapsed;
    
    els.zikrTotal.textContent = totalZikr;
    els.zikrAverage.textContent = zikrAvg.toFixed(1);
    
    // Sawm (Unique Dates)
    const fastingDates = new Set();
    records.forEach(r => {
        if (r.sawmCompleted) fastingDates.add(r.date);
    });
    els.sawmTotal.textContent = fastingDates.size;
    
    // Trajectories
    updateTrajectory(
        els.quranTrajectory, 
        totalPages, 
        daysElapsed * 10, 
        daysElapsed
    );
    updateTrajectory(
        els.zikrTrajectory, 
        totalZikr, 
        daysElapsed * 55, 
        daysElapsed
    );
}

function updateTrajectory(element, actual, expected, daysElapsed) {
    if (records.length === 0 || daysElapsed <= 0) {
        element.innerHTML = '⏳ Pending';
        element.className = 'trajectory-badge status-pending';
        return;
    }
    
    if (actual >= expected) {
        element.innerHTML = '✓ Ahead of reference';
        element.className = 'trajectory-badge status-ahead';
    } else {
        element.innerHTML = '📉 Behind reference';
        element.className = 'trajectory-badge status-behind';
    }
}

// HISTORY RENDERING
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[tag]));
}

function formatDateDisplay(dateStr) {
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) return dateStr;
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return dateObj.toLocaleDateString(undefined, options).toUpperCase();
}

function renderHistory() {
    els.historyContainer.innerHTML = '';
    
    if (records.length === 0) {
        els.historyContainer.innerHTML = `
            <div class="empty-state">
                No records yet. Your first entry will appear here.
            </div>
        `;
        return;
    }
    
    // Sort by date DESC, then createdAt DESC
    const sorted = [...records].sort((a, b) => {
        if (a.date !== b.date) {
            return new Date(b.date) - new Date(a.date);
        }
        return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    sorted.forEach(record => {
        const item = document.createElement('div');
        item.className = 'history-item';
        
        let notesHtml = '';
        if (record.notes && record.notes.trim() !== '') {
            notesHtml = `<div class="history-note">"${escapeHTML(record.notes)}"</div>`;
        }
        
        let sawmHtml = record.sawmCompleted 
            ? `<div>Sawm: <span class="sawm-check">✓ Completed</span></div>` 
            : '';
            
        item.innerHTML = `
            <div class="history-item-header">
                <div class="history-date">${formatDateDisplay(record.date)}</div>
                <button class="btn-delete-record" data-id="${record.id}" aria-label="Delete this record" title="Delete record">&times;</button>
            </div>
            <div class="history-details">
                <div>Qur'an: <span class="highlight">${record.quranPages} pages</span></div>
                <div>Zikr Total: <span class="highlight">${record.zikrTotal}</span> 
                     <small class="text-muted">(S: ${record.salawat} | Sub: ${record.subhanAllah} | Ist: ${record.istighfar})</small>
                </div>
                ${sawmHtml}
            </div>
            ${notesHtml}
        `;
        els.historyContainer.appendChild(item);
    });
}

// FORM HANDLING
function handleFormSubmit(e) {
    e.preventDefault();
    
    const dateVal = els.dateInput.value;
    const quranVal = Math.max(0, parseInt(els.quranInput.value, 10) || 0);
    const salawatVal = Math.max(0, parseInt(els.salawatInput.value, 10) || 0);
    const subhanVal = Math.max(0, parseInt(els.subhanAllahInput.value, 10) || 0);
    const istighfarVal = Math.max(0, parseInt(els.istighfarInput.value, 10) || 0);
    const sawmVal = els.sawmInput.checked;
    const notesVal = els.notesInput.value.trim();
    
    const zikrTotal = salawatVal + subhanVal + istighfarVal;
    
    const newRecord = {
        id: crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now(),
        date: dateVal,
        quranPages: quranVal,
        salawat: salawatVal,
        subhanAllah: subhanVal,
        istighfar: istighfarVal,
        zikrTotal: zikrTotal,
        sawmCompleted: sawmVal,
        notes: notesVal,
        createdAt: new Date().toISOString()
    };
    
    records.push(newRecord);
    saveRecords();
    
    // Reset Form (retain date)
    els.form.reset();
    els.dateInput.value = dateVal;
    
    updateDashboard();
    renderHistory();
    
    // UI Feedback
    const originalText = els.submitBtn.textContent;
    els.submitBtn.textContent = '✓ Saved Successfully';
    els.submitBtn.style.backgroundColor = 'var(--success)';
    
    setTimeout(() => {
        els.submitBtn.textContent = originalText;
        els.submitBtn.style.backgroundColor = '';
    }, 2000);
}

// EVENT LISTENERS
function attachEventListeners() {
    // Form Submit
    els.form.addEventListener('submit', handleFormSubmit);
    
    // Qur'an Steppers
    els.steppers.forEach(btn => {
        btn.addEventListener('click', () => {
            const step = parseInt(btn.getAttribute('data-step'), 10);
            const current = parseInt(els.quranInput.value, 10) || 0;
            els.quranInput.value = Math.max(0, current + step);
        });
    });
    
    // Fill Baseline
    els.fillBaselineBtn.addEventListener('click', () => {
        els.salawatInput.value = 15;
        els.subhanAllahInput.value = 10;
        els.istighfarInput.value = 30;
    });
    
    // Input Validation to prevent negative typing
    [els.quranInput, els.salawatInput, els.subhanAllahInput, els.istighfarInput].forEach(input => {
        input.addEventListener('input', (e) => {
            if (e.target.value !== '' && parseInt(e.target.value, 10) < 0) {
                e.target.value = 0;
            }
        });
    });
    
    // Individual Record Deletion (Event Delegation)
    els.historyContainer.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.btn-delete-record');
        if (deleteBtn) {
            const recordId = deleteBtn.getAttribute('data-id');
            if (confirm("Delete this daily record?")) {
                records = records.filter(r => r.id !== recordId);
                saveRecords();
                updateDashboard();
                renderHistory();
            }
        }
    });
    
    // Drawer Handlers
    const openDrawer = () => { els.drawer.classList.add('open'); els.drawer.setAttribute('aria-hidden', 'false'); };
    const closeDrawer = () => { els.drawer.classList.remove('open'); els.drawer.setAttribute('aria-hidden', 'true'); };
    
    els.openSopBtn.addEventListener('click', openDrawer);
    els.closeSopBtn.addEventListener('click', closeDrawer);
    els.drawerBackdrop.addEventListener('click', closeDrawer);
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && els.drawer.classList.contains('open')) {
            closeDrawer();
        }
    });
    
    // Reset All
    els.resetBtn.addEventListener('click', () => {
        if (confirm("Delete all saved records? This cannot be undone.")) {
            localStorage.removeItem(STORAGE_KEY);
            records = [];
            updateDashboard();
            renderHistory();
        }
    });
}

// Start App
init();