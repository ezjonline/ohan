// OHAN Global Scripts

// 1. Navigation Logic
const menuBtn = document.getElementById('menu-btn');
const navMenu = document.getElementById('nav-menu');

if (menuBtn && navMenu) {
    menuBtn.addEventListener('click', () => {
        const expanded = menuBtn.getAttribute('aria-expanded') === 'true';
        menuBtn.setAttribute('aria-expanded', !expanded);
        navMenu.classList.toggle('is-active');
    });
}

// Initialize Icons
if (typeof lucide !== 'undefined') {
    lucide.createIcons();
}

// 2. Google Sheets CMS Integration
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/15i6etUT2Hfl3XRckvhMTLPbZ3HCRZzK1xaHppILw5cw/export?format=csv';

// State
let allClinics = [];

// DOM Elements (Only present on Clinics page)
const clinicsContainer = document.getElementById('clinics-container');
const loadingIndicator = document.getElementById('loading-indicator');
const noResultsInfo = document.getElementById('no-results');
const zipSearchInput = document.getElementById('zip-search');
const searchBtn = document.getElementById('search-btn');
const clearSearchBtn = document.getElementById('clear-search-btn');

// CSV Parser Helper
function parseCSV(text) {
    // Split into lines, filtering empty lines
    const lines = text.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) return []; // No data

    // Extract headers
    const headers = parseCSVLine(lines[0]);

    // Parse rows
    return lines.slice(1).map(line => {
        const values = parseCSVLine(line);
        const obj = {};
        headers.forEach((header, index) => {
            // Clean headers (remove extra space/quotes if any)
            const key = header.trim();
            obj[key] = values[index] ? values[index].trim() : '';
        });
        return obj;
    });
}

// Handles quoted commas e.g. "Dental, Exam", 78704
function parseCSVLine(text) {
    let result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);

    // Clean up quotes around values
    return result.map(val => val.replace(/^"|"$/g, '').trim());
}

// Initialization
async function initClinics() {
    if (!clinicsContainer) return; // Not on clinics page

    try {
        const response = await fetch(SHEET_URL);
        const text = await response.text();
        allClinics = parseCSV(text);

        if (loadingIndicator) loadingIndicator.style.display = 'none';
        renderClinics(allClinics);
    } catch (error) {
        console.error('Error loading clinics:', error);
        if (loadingIndicator) loadingIndicator.innerHTML = '<p style="color: red;">Failed to load clinic data. Please refresh to try again.</p>';
    }
}

// Rendering Logic
function renderClinics(clinics) {
    clinicsContainer.innerHTML = ''; // Clear container

    if (clinics.length === 0) {
        clinicsContainer.style.display = 'none';
        if (noResultsInfo) noResultsInfo.style.display = 'block';
        return;
    }

    clinicsContainer.style.display = 'grid'; // Restore grid
    if (noResultsInfo) noResultsInfo.style.display = 'none';

    clinics.forEach((clinic, index) => {
        const card = document.createElement('div');
        card.className = 'card';

        // Data mapping
        const name = clinic['Clinic Name'] || 'Unknown Clinic';
        const specialty = clinic['Specialty'] || 'General';
        const zip = clinic['Zip Code'] || '';
        const city = clinic['City'] || 'Austin';
        const state = clinic['State'] || 'TX';
        const phone = clinic['Phone Number'] || 'N/A';
        const website = clinic['Website'] || '#';
        const services = clinic['Services Offered'] || 'Contact for services';
        const insurance = clinic['Insurance Accepted'] || 'Contact clinic';

        card.innerHTML = `
            <div class="flex justify-between items-start" style="margin-bottom: var(--spacing-2);">
                <h3 style="margin: 0; font-size: 1.125rem;">${name}</h3>
                <span class="badge-specialty">${specialty}</span>
            </div>
            
            <div class="flex gap-2 text-muted" style="margin-bottom: var(--spacing-2); font-size: 0.875rem;">
                <i data-lucide="map-pin" style="width: 16px; min-width: 16px;"></i>
                <span>${city}, ${state} ${zip}</span>
            </div>
            
            <div class="flex gap-2 text-muted" style="margin-bottom: var(--spacing-3); font-size: 0.875rem;">
                <i data-lucide="phone" style="width: 16px; min-width: 16px;"></i>
                <a href="tel:${phone}" style="color: inherit; text-decoration: none;">${phone}</a>
            </div>

            <a href="${website}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary" style="width: 100%; text-align: center; justify-content: center;">
                Visit Website <i data-lucide="external-link" style="width: 14px; margin-left: 4px;"></i>
            </a>

            <button class="details-btn" onclick="toggleDetails(${index})">
                View Services & Details <i data-lucide="chevron-down" style="width: 14px;"></i>
            </button>

            <div id="details-${index}" class="card-details">
                <p><strong>Insurance:</strong> ${insurance}</p>
                <p><strong>Services:</strong> ${services}</p>
            </div>
        `;
        clinicsContainer.appendChild(card);
    });

    // Re-initialize icons
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// Global scope required for inline onclick
window.toggleDetails = function (index) {
    const details = document.getElementById(`details-${index}`);
    if (details) {
        const isOpen = details.classList.contains('is-open');
        if (isOpen) {
            details.classList.remove('is-open');
        } else {
            details.classList.add('is-open');
        }
    }
};

// Search Logic
function handleSearch() {
    const query = zipSearchInput.value.trim();
    if (!query) {
        renderClinics(allClinics);
        return;
    }

    const filtered = allClinics.filter(clinic => {
        const cZip = clinic['Zip Code'] || '';
        return cZip.includes(query);
    });

    renderClinics(filtered);
}

// Event Listeners
if (searchBtn) {
    searchBtn.addEventListener('click', handleSearch);
}
if (zipSearchInput) {
    zipSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
}
if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
        zipSearchInput.value = '';
        renderClinics(allClinics);
    });
}

// Init
document.addEventListener('DOMContentLoaded', initClinics);
