/**
 * OHAN Health Cookie Consent Banner
 * Handles user consent for analytics cookies (gtag.js)
 */

(function () {
    const CONSENT_KEY = 'ohan_cookie_consent';

    function init() {
        const consent = localStorage.getItem(CONSENT_KEY);
        if (!consent) {
            showBanner();
        } else {
            const preferences = JSON.parse(consent);
            applyConsent(preferences.analytics);
        }
    }

    function showBanner() {
        const banner = document.createElement('div');
        banner.id = 'cookie-consent-banner';
        banner.className = 'cookie-banner';
        banner.innerHTML = `
            <div class="container flex flex-col md:flex-row items-center gap-4">
                <div class="cookie-content">
                    <p>We use cookies to improve website functionality and analyze site traffic. Some cookies are essential for the site to function, while others help us understand how the site is used. You can accept or decline non-essential cookies.</p>
                </div>
                <div class="cookie-actions flex gap-2 flex-wrap">
                    <button id="cookie-accept-all" class="btn btn-primary btn-sm">Accept All</button>
                    <button id="cookie-decline-non" class="btn btn-outline btn-sm">Decline Non-Essential</button>
                    <a href="/cookies" class="nav-link" style="font-size: 0.875rem;">Learn More</a>
                </div>
            </div>
        `;
        document.body.appendChild(banner);

        document.getElementById('cookie-accept-all').addEventListener('click', () => {
            savePreference(true);
        });

        document.getElementById('cookie-decline-non').addEventListener('click', () => {
            savePreference(false);
        });
    }

    function savePreference(analyticsGranted) {
        const preferences = {
            analytics: analyticsGranted,
            timestamp: new Date().getTime()
        };
        localStorage.setItem(CONSENT_KEY, JSON.stringify(preferences));
        applyConsent(analyticsGranted);
        hideBanner();
    }

    function applyConsent(analyticsGranted) {
        if (typeof gtag === 'function') {
            gtag('consent', 'update', {
                'analytics_storage': analyticsGranted ? 'granted' : 'denied'
            });
        }
    }

    function hideBanner() {
        const banner = document.getElementById('cookie-consent-banner');
        if (banner) {
            banner.style.display = 'none';
        }
    }

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
