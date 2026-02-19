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

// Navbar Scroll Effect
const navbar = document.querySelector('.navbar');
if (navbar) {
    window.addEventListener('scroll', () => {
        if (window.scrollY > 20) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

// Initialize Icons
if (typeof lucide !== 'undefined') {
    lucide.createIcons();
}

// 2. Airtable CMS Integration (Via Secure Proxy)
const PROXY_URL = '/api/clinics';

// State
let allClinics = [];

// DOM Elements
const clinicsContainer = document.getElementById('clinics-container');
const loadingIndicator = document.getElementById('loading-indicator');
const noResultsInfo = document.getElementById('no-results');
const zipSearchInput = document.getElementById('zip-search');
const specialtyFilter = document.getElementById('specialty-filter');
const distanceFilter = document.getElementById('distance-filter');
const searchBtn = document.getElementById('search-btn');

// --- GEOCODING DATABASE (Austin Area) ---
// Simplified lookup to avoid external API dependencies for this demo
const knownZips = {
    '78701': { lat: 30.2729, lon: -97.7444 }, // Downtown
    '78702': { lat: 30.2649, lon: -97.7127 }, // East Austin
    '78703': { lat: 30.2902, lon: -97.7622 }, // Clarksville
    '78704': { lat: 30.2435, lon: -97.7656 }, // South Congress
    '78705': { lat: 30.2926, lon: -97.7381 }, // UT
    '78721': { lat: 30.2696, lon: -97.6928 },
    '78722': { lat: 30.2858, lon: -97.7157 },
    '78723': { lat: 30.3060, lon: -97.6880 },
    '78741': { lat: 30.2291, lon: -97.7214 }, // Riverside
    '78744': { lat: 30.1872, lon: -97.7371 }, // Southeast
    '78745': { lat: 30.2078, lon: -97.7958 }, // South
    '78746': { lat: 30.2980, lon: -97.8050 }, // West Lake
    '78748': { lat: 30.1633, lon: -97.8236 }, // Far South
    '78751': { lat: 30.3129, lon: -97.7277 }, // Hyde Park
    '78752': { lat: 30.3342, lon: -97.7056 },
    '78753': { lat: 30.3752, lon: -97.6816 }, // North
    '78757': { lat: 30.3540, lon: -97.7340 }, // Allandale
    '78758': { lat: 30.3800, lon: -97.7120 }, // North Austin
    '78759': { lat: 30.4045, lon: -97.7516 }, // Arboretum
    '78613': { lat: 30.5186, lon: -97.8465 }, // Cedar Park
    '78660': { lat: 30.4578, lon: -97.6094 }, // Pflugerville
    '78664': { lat: 30.4783, lon: -97.6631 }, // Round Rock
    '78681': { lat: 30.5366, lon: -97.6991 }, // Round Rock West
    '78653': { lat: 30.3700, lon: -97.5200 }, // Manor
    '78617': { lat: 30.1700, lon: -97.6200 }, // Del Valle
    '78654': { lat: 30.5600, lon: -98.0500 }, // Marble Falls
    '78641': { lat: 30.5200, lon: -97.9000 }, // Leander
    '73301': { lat: 30.2672, lon: -97.7431 } // IRS
};

// Initialization
async function initClinics() {
    console.log('[Clinic] Starting initialization...');

    // DOM Elements (Re-query inside init to be safe)
    const clinicsContainer = document.getElementById('clinics-container');
    const loadingIndicator = document.getElementById('loading-indicator');

    if (!clinicsContainer) {
        console.warn('[Clinic] Container not found, skipping init.');
        return;
    }

    // Populate filters immediately (static list)
    populateSpecialties();

    try {
        console.log('[Clinic] Attempting to fetch records via proxy...');
        allClinics = await fetchAllAirtableRecords();
        console.log(`[Clinic] Successfully loaded ${allClinics.length} clinics`);

        if (loadingIndicator) loadingIndicator.style.display = 'none';

        console.log('[Clinic] Starting DOM rendering...');
        renderClinics(allClinics);
        console.log('[Clinic] Rendering complete.');
    } catch (error) {
        console.error('[Clinic] Error loading clinics:', error);
        if (loadingIndicator) {
            loadingIndicator.innerHTML = `
                <div style="color: #e53e3e; padding: 2rem; border: 1px solid #fed7d7; background: #fff5f5; border-radius: 8px;">
                    <h3>Failed to load clinic data</h3>
                    <p>${error.message}</p>
                    <p style="font-size: 0.85rem; margin-top: 1rem;">Please check the server console for details.</p>
                </div>
            `;
        }
    }
}

// Populate Specialty Dropdown (Fixed List)
function populateSpecialties() {
    const specialtyFilter = document.getElementById('specialty-filter');
    if (!specialtyFilter) {
        console.error('Specialty filter element not found!');
        return;
    }

    // Clear existing options except the first "All Specialties"
    specialtyFilter.innerHTML = '<option value="">All Specialties</option>';

    // Hardcoded list per user request
    const specialties = [
        "Orthodontics",
        "Periodontics",
        "Prosthodontics",
        "Endodontics",
        "Oral Surgery",
        "General Anesthesia",
        "Special Health Care",
        "Pediatrics",
        "Family Dentistry",
        "General Dentistry"
    ];

    specialties.sort().forEach(spec => {
        const option = document.createElement('option');
        option.value = spec; // Keeps original casing for display? No, use as value.
        option.textContent = spec;
        specialtyFilter.appendChild(option);
    });
}

// Fetch all from Proxy
async function fetchAllAirtableRecords() {
    const response = await fetch(PROXY_URL);

    if (!response.ok) {
        const text = await response.text();
        console.error('[Clinic] Proxy API Error Body:', text.substring(0, 200));
        throw new Error(`Server error: ${response.status}`);
    }

    let data;
    const text = await response.text();
    try {
        data = JSON.parse(text);
    } catch (e) {
        console.error('[Clinic] Failed to parse JSON. Body starts with:', text.substring(0, 200));
        throw new Error('Invalid response format from server');
    }

    console.log('[Clinic] Raw data received from proxy:', data);

    if (!data.records || !Array.isArray(data.records)) {
        console.error('[Clinic] Invalid data format:', data);
        return [];
    }

    const mapped = data.records.map((record, index) => {
        const f = record.fields;

        // Log first record fields for audit as requested
        if (index === 0) {
            console.log('[Clinic] Smart Mapping Audit (First Record):', f);
        }

        // --- SMART FIELD MAPPING ---
        // Handles variations in Airtable field names
        const getField = (names) => {
            const found = names.find(name => f[name] !== undefined);
            return found ? f[found] : null;
        };

        const mappedRecord = {
            'Clinic Name': getField(['Clinic Name', 'Name', 'Organization Name']),
            'City': getField(['City', 'Location City']),
            'State': getField(['State', 'Prov/State']),
            'Zip Code': String(getField(['Zip Code', 'ZIP', 'Postal Code']) || '').trim(),
            'Phone Number': getField(['Phone Number', 'Phone', 'Contact Number']),
            'Website': getField(['Website', 'URL', 'Link']),
            'Treatment Specialty': getField(['Treatment Specialties', 'Specialty', 'Department']),
            'Services Offered': getField(['Services Offered', 'Services', 'Description']),
            'Insurance Accepted': getField(['Insurance Accepted', 'Insurance', 'Payment Methods']),
            'Clinic Type': getField(['Clinic Type', 'Type', 'Classification']),
            'Classification Note': getField(['Services Offered Classification Note', 'Notes', 'Additional Info'])
        };

        // Flatten arrays to strings (common in Airtable multi-selects)
        Object.keys(mappedRecord).forEach(key => {
            if (Array.isArray(mappedRecord[key])) {
                mappedRecord[key] = mappedRecord[key].join(', ');
            }
        });

        return mappedRecord;
    });

    console.log('[Clinic] Mapping complete. First mapped record:', mapped[0]);
    return mapped;
}

// Geo Helpers
function getZipCoordinates(zip) {
    // 1. Try exact match
    if (knownZips[zip]) return knownZips[zip];

    // 2. Fallback: If 5 digit zip not found, maybe return null
    // Ideally we would use an API here.
    return null;
}

// Haversine Formula (Miles)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 3958.8; // Radius of Earth in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Rendering Logic
function renderClinics(clinics) {
    const clinicsContainer = document.getElementById('clinics-container');
    const noResultsInfo = document.getElementById('no-results');

    clinicsContainer.innerHTML = '';

    if (clinics.length === 0) {
        clinicsContainer.style.display = 'none';
        if (noResultsInfo) {
            noResultsInfo.style.display = 'block';
            // Update no-results text based on filter
            const msg = document.querySelector('#no-results p');
            if (msg) msg.textContent = "Try adjusting your filters (Specialty or Distance) to see more results.";
        }
        return;
    }

    clinicsContainer.style.display = 'grid';
    if (noResultsInfo) noResultsInfo.style.display = 'none';

    clinics.forEach((clinic, index) => {
        const card = document.createElement('div');
        card.className = 'card';

        // Data mapping
        const name = clinic['Clinic Name'] || 'Unknown Clinic';
        const specialty = clinic['Treatment Specialty'] || 'General';
        const zip = clinic['Zip Code'] || '';
        const city = clinic['City'] || 'Austin';
        const state = clinic['State'] || 'TX';
        const phone = clinic['Phone Number'] || 'N/A';
        const website = clinic['Website'] || '#';
        const services = clinic['Services Offered'] || 'Contact for services';
        const insurance = clinic['Insurance Accepted'] || 'Contact clinic';
        const type = clinic['Clinic Type'] || '';
        const note = clinic['Classification Note'] || '';

        let validUrl = website;
        if (validUrl !== '#' && !validUrl.startsWith('http')) {
            validUrl = 'https://' + validUrl;
        }

        // Add Distance Badge if available (and sorted)
        let distanceBadge = '';
        if (clinic.distanceNice) {
            distanceBadge = `<span style="font-size: 0.8rem; background: #eef2ff; color: #4338ca; padding: 2px 8px; border-radius: 12px; font-weight: 600;">${clinic.distanceNice}</span>`;
        }

        card.innerHTML = `
            <div class="flex justify-between items-start" style="margin-bottom: var(--spacing-2);">
                <div style="flex: 1; padding-right: 8px;">
                    <h3 style="margin: 0; font-size: 1.125rem;">${name}</h3>
                </div>
                <!-- Stack badges -->
                <div class="flex flex-col items-end gap-1">
                    <span class="badge-specialty">${specialty}</span>
                    ${distanceBadge}
                </div>
            </div>
            
            <div class="flex gap-2 text-muted" style="margin-bottom: var(--spacing-2); font-size: 0.875rem;">
                <i data-lucide="map-pin" style="width: 16px; min-width: 16px;"></i>
                <span>${city}, ${state} ${zip}</span>
            </div>
            
            <div class="flex gap-2 text-muted" style="margin-bottom: var(--spacing-3); font-size: 0.875rem;">
                <i data-lucide="phone" style="width: 16px; min-width: 16px;"></i>
                <a href="tel:${phone}" style="color: inherit; text-decoration: none;">${phone}</a>
            </div>

            <a href="${validUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary" style="width: 100%; text-align: center; justify-content: center;">
                Visit Website <i data-lucide="external-link" style="width: 14px; margin-left: 4px;"></i>
            </a>

            <button class="details-btn" onclick="toggleDetails(${index})">
                View Services & Details <i data-lucide="chevron-down" style="width: 14px;"></i>
            </button>

            <div id="details-${index}" class="card-details">
                ${type ? `<p><strong>Type:</strong> ${type}</p>` : ''}
                <p><strong>Insurance:</strong> ${insurance}</p>
                <p><strong>Services:</strong> ${services}</p>
                 ${note ? `<p style="font-size: 0.85em; font-style: italic; color: #666; margin-top: 4px;">Note: ${note}</p>` : ''}
            </div>
        `;
        clinicsContainer.appendChild(card);
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

window.toggleDetails = function (index) {
    const details = document.getElementById(`details-${index}`);
    if (details) {
        details.classList.toggle('is-open');
    }
};

// Search Logic
function handleSearch() {
    // Re-query elements to ensure they exist
    const specialtyFilter = document.getElementById('specialty-filter');
    const zipSearchInput = document.getElementById('zip-search');
    const distanceFilter = document.getElementById('distance-filter');

    const selectedSpecialty = specialtyFilter ? specialtyFilter.value : '';
    const zipQuery = zipSearchInput ? zipSearchInput.value.trim() : '';
    const radiusMiles = distanceFilter ? parseFloat(distanceFilter.value) : 25;

    let filtered = allClinics.filter(clinic => {
        // 1. Specialty Filter (Fuzzy Match logic)
        if (selectedSpecialty) {
            // Normalize clinic specialty string
            // Handle array or CSV string from Airtable
            const rawSpec = clinic['Treatment Specialty'] || '';
            const cSpecs = rawSpec.toLowerCase().split(',').map(s => s.trim());
            const targetSpec = selectedSpecialty.toLowerCase();

            // Check if any part matches. 
            // Often Airtable might have "Pediatric Dentistry" vs "Pediatrics".
            // Or "Orthodontics" vs "Orthodontic".
            // Let's use includes() for broader matching if exact fails?
            // User requested "only show the periodontics right now".
            // So if I select "Periodontics", "Periodontics" should show.

            // Check for exact match in the array first
            const exactMatch = cSpecs.includes(targetSpec);

            // Or if the clinic specialty string contains the selected word
            const partialMatch = rawSpec.toLowerCase().includes(targetSpec);

            if (!exactMatch && !partialMatch) return false;
        }

        return true;
    });

    // 2. Distance Filter (Only if Zip is entered)
    if (zipQuery) {
        const userCoords = getZipCoordinates(zipQuery);

        if (userCoords) {
            const withDistance = [];
            filtered.forEach(clinic => {
                const cZip = clinic['Zip Code'];
                const cCoords = getZipCoordinates(cZip);

                if (cCoords) {
                    const d = calculateDistance(userCoords.lat, userCoords.lon, cCoords.lat, cCoords.lon);
                    if (d <= radiusMiles) {
                        clinic.distance = d;
                        clinic.distanceNice = d < 0.1 ? 'Nearby' : `${d.toFixed(1)} mi`;
                        withDistance.push(clinic);
                    }
                } else {
                    // Fallback: Exact Zip Match gets 0 distance
                    if (cZip === zipQuery) {
                        clinic.distance = 0;
                        clinic.distanceNice = 'Same Zip';
                        withDistance.push(clinic);
                    }
                }
            });

            withDistance.sort((a, b) => a.distance - b.distance);
            filtered = withDistance;

        } else {
            alert(`Location for ${zipQuery} not found in our demo database. Showing exact zip matches only.`);
            filtered = filtered.filter(c => c['Zip Code'] === zipQuery);
        }
    } else {
        // No zip entered, clean up previous distance badges
        filtered.forEach(c => {
            delete c.distance;
            delete c.distanceNice;
        });
    }

    renderClinics(filtered);
}

// Event Listeners (Attach inside DOMContentLoaded or check existence)
document.addEventListener('DOMContentLoaded', () => {
    initClinics();

    // Attach listeners
    const searchBtn = document.getElementById('search-btn');
    const zipInput = document.getElementById('zip-search');
    const specFilter = document.getElementById('specialty-filter');
    const distFilter = document.getElementById('distance-filter');

    if (searchBtn) searchBtn.addEventListener('click', handleSearch);
    if (zipInput) {
        zipInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSearch();
        });
    }
    if (specFilter) specFilter.addEventListener('change', handleSearch);
    if (distFilter) {
        distFilter.addEventListener('change', () => {
            if (zipInput && zipInput.value.length >= 5) handleSearch();
        });
    }
});
