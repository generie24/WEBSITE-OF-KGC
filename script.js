(function () {
  const STORAGE_KEY = 'kgc_pending_booking_company';
  const COMPANY_NAME_MAP = {
    'brains-infinite-innovations': 'Brains Infinite Innovations Inc.',
    'klassic-solutions': 'Klassic Solutions Inc.',
    'klassic-marketing': 'Klassic Marketing Inc.',
    'westwood-development': 'Westwood Development Corp.',
    'westwood-law': 'Westwood Law',
    'connector': 'Connector',
    'the-green-oasis': 'The Green Oasis',
    'luxurious-cleaning': 'Luxurious Cleaning Co.',
    'hyt-foundation': 'HYT Foundation Inc.'
  };

  function slugifyCompany(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function resolveCompanyName(value) {
    if (!value) return '';
    const normalized = slugifyCompany(value);
    if (COMPANY_NAME_MAP[normalized]) return COMPANY_NAME_MAP[normalized];

    const directMatch = Object.keys(COMPANY_NAME_MAP).find(function (key) {
      return COMPANY_NAME_MAP[key].toLowerCase() === String(value).trim().toLowerCase();
    });

    return directMatch ? COMPANY_NAME_MAP[directMatch] : String(value).trim();
  }

  function getPendingSelection() {
    try {
      return localStorage.getItem(STORAGE_KEY) || '';
    } catch (err) {
      return '';
    }
  }

  function setPendingSelection(companyName) {
    const resolved = resolveCompanyName(companyName);
    if (!resolved) return false;

    try {
      localStorage.setItem(STORAGE_KEY, resolved);
      return true;
    } catch (err) {
      return false;
    }
  }

  function clearPendingSelection() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      // no-op
    }
  }

  function preselectCompanyInBooking(companyName) {
    const resolved = resolveCompanyName(companyName);
    if (!resolved) return false;

    const subsidiaryInput = Array.from(document.querySelectorAll('input[name="subsidiary"]')).find(function (input) {
      return String(input.value || '').trim() === resolved;
    });

    if (!subsidiaryInput) return false;

    subsidiaryInput.checked = true;

    const subsidiaryEntry = subsidiaryInput.closest('.subsidiary-entry');
    const servicesPanel = subsidiaryEntry ? subsidiaryEntry.querySelector('.subsidiary-services') : null;

    if (servicesPanel) {
      servicesPanel.classList.remove('hidden');
    }

    const serviceCheckboxes = subsidiaryEntry ? subsidiaryEntry.querySelectorAll('input[name="companyService"]') : [];
    serviceCheckboxes.forEach(function (input) {
      input.checked = true;
    });

    if (typeof window.toggleSubsidiaryServicePanels === 'function') {
      window.toggleSubsidiaryServicePanels();
    }

    return true;
  }

  function handleCardBookNow(button) {
    const companyValue = button.getAttribute('data-company') || button.getAttribute('data-company-name') || '';
    const companyName = resolveCompanyName(companyValue);

    if (!companyName) {
      return;
    }

    if (window.portalState && window.portalState.isLoggedIn) {
      if (typeof window.openBookingDirect === 'function') {
        window.openBookingDirect(companyName);
      }
      return;
    }

    setPendingSelection(companyName);

    if (typeof window.openModal === 'function') {
      window.openModal('authModal');
    }

    if (typeof window.switchAuthRole === 'function') {
      window.switchAuthRole('client');
    }

    if (typeof window.switchAuthTab === 'function') {
      window.switchAuthTab('login');
    }
  }

  function handlePendingBookingSelection() {
    const companyName = getPendingSelection();
    if (!companyName) return false;

    clearPendingSelection();

    if (typeof window.openBookingDirect === 'function') {
      window.openBookingDirect(companyName);
      return true;
    }

    return false;
  }

  document.addEventListener('click', function (event) {
    const button = event.target.closest('[data-book-now]');
    if (!button) return;
    event.preventDefault();
    handleCardBookNow(button);
  });

  window.KGCBookingSelection = {
    STORAGE_KEY: STORAGE_KEY,
    getPendingSelection: getPendingSelection,
    setPendingSelection: setPendingSelection,
    clearPendingSelection: clearPendingSelection,
    preselectCompanyInBooking: preselectCompanyInBooking,
    handlePendingBookingSelection: handlePendingBookingSelection,
    resolveCompanyName: resolveCompanyName
  };

  window.handlePendingBookingSelection = handlePendingBookingSelection;
  window.preselectCompanyInBooking = preselectCompanyInBooking;
})();
