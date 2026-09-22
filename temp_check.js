    // Three.js setup
    let scene, camera, renderer, sphere, particleSystem;
    let mouseX = 0, mouseY = 0;
    
    function initThree() {
      const canvas = document.getElementById('three-canvas');
      scene = new THREE.Scene();
      
      camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.z = 5;
      
      renderer = new THREE.WebGLRenderer({ 
        canvas: canvas, 
        alpha: true,
        antialias: true 
      });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
      
      // Create wireframe sphere
      const geometry = new THREE.IcosahedronGeometry(2, 1);
      const material = new THREE.MeshBasicMaterial({ 
        color: 0xD4AF37,
        wireframe: true,
        transparent: true,
        opacity: 0.15
      });
      sphere = new THREE.Mesh(geometry, material);
      scene.add(sphere);
      
      // Create particles
      const particlesGeometry = new THREE.BufferGeometry();
      const particleCount = 1000;
      const positions = new Float32Array(particleCount * 3);
      
      for(let i = 0; i < particleCount * 3; i++) {
        positions[i] = (Math.random() - 0.5) * 10;
      }
      
      particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      
      const particlesMaterial = new THREE.PointsMaterial({
        color: 0xF4E5A1,
        size: 0.02,
        transparent: true,
        opacity: 0.6
      });
      
      particleSystem = new THREE.Points(particlesGeometry, particlesMaterial);
      scene.add(particleSystem);
      
      animate();
    }
    
    function animate() {
      requestAnimationFrame(animate);
      
      if (sphere) {
        sphere.rotation.x += 0.001;
        sphere.rotation.y += 0.002;
        sphere.rotation.x += (mouseY * 0.0005);
        sphere.rotation.y += (mouseX * 0.0005);
      }
      
      if (particleSystem) {
        particleSystem.rotation.y += 0.0005;
      }
      
      renderer.render(scene, camera);
    }
    
    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX - window.innerWidth / 2;
      mouseY = e.clientY - window.innerHeight / 2;
    });
    
    // Initialize Three.js
    initThree();
    
    // Gradient background scroll effect - Dark theme
    function updateGradientOnScroll() {
      const scrollProgress = window.scrollY / (document.body.scrollHeight - window.innerHeight);
      const gradientBg = document.getElementById('gradient-bg');
      
      const colors = [
        { pos: 0, color: '#0A0A0F' },
        { pos: 0.2, color: '#1A1A24' },
        { pos: 0.4, color: '#2A2A35' },
        { pos: 0.6, color: '#1A1A24' },
        { pos: 0.8, color: '#0F0F15' },
        { pos: 1, color: '#0A0A0F' }
      ];
      
      let currentColorIndex = 0;
      for (let i = 0; i < colors.length - 1; i++) {
        if (scrollProgress >= colors[i].pos && scrollProgress <= colors[i + 1].pos) {
          currentColorIndex = i;
          break;
        }
      }
      
      const color1 = colors[currentColorIndex].color;
      const color2 = colors[currentColorIndex + 1] ? colors[currentColorIndex + 1].color : colors[currentColorIndex].color;
      
      gradientBg.style.background = `linear-gradient(135deg, ${color1}, ${color2})`;
    }
    
    window.addEventListener('scroll', updateGradientOnScroll);
    
    // Resize handler
    window.addEventListener('resize', () => {
      if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      }
    });
    
    // Mobile Menu Toggle
    const mobileToggle = document.getElementById('mobileToggle');
    const mainNav = document.getElementById('mainNav');
    
    if (mobileToggle) {
      mobileToggle.addEventListener('click', () => {
        mainNav.classList.toggle('active');
      });
    }
    
    // Smooth Scrolling for Navigation Links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        const target = document.querySelector(targetId);
        
        if (target) {
          // Check if it's a company card
          const isCompanyCard = targetId.includes('company-');
          
          if (isCompanyCard) {
            // Get exact measurements
            const headerHeight = 80; // Fixed header height
            const windowHeight = window.innerHeight;
            
            // Calculate available viewport height (excluding header)
            const availableHeight = windowHeight - headerHeight;
            
            // Get target element position and height
            const targetRect = target.getBoundingClientRect();
            const currentScrollY = window.pageYOffset || document.documentElement.scrollTop;
            const targetTopFromDocument = targetRect.top + currentScrollY;
            const targetHeight = target.offsetHeight;
            
            // Calculate the position where card will be centered
            // We want equal space above and below the card in the visible area
            const offsetFromTop = (availableHeight - targetHeight) / 2;
            
            // Final scroll position: card top position minus header minus the offset to center
            const finalScrollPosition = targetTopFromDocument - headerHeight - offsetFromTop;
            
            // Scroll to the calculated position
            window.scrollTo({
              top: Math.max(0, finalScrollPosition), // Don't scroll above 0
              behavior: 'smooth'
            });
          } else {
            // Regular scroll behavior for other sections
            const targetRect = target.getBoundingClientRect();
            const targetTop = targetRect.top + window.pageYOffset;
            const headerHeight = 80;
            
            window.scrollTo({
              top: targetTop - headerHeight - 20,
              behavior: 'smooth'
            });
          }
          
          // Close mobile menu if open
          if (mainNav.classList.contains('active')) {
            mainNav.classList.remove('active');
          }
        }
      });
    });
    
    // Header Shadow on Scroll
    const header = document.querySelector('.site-header');
    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        header.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.1)';
      } else {
        header.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.05)';
      }
    });
    
    // ===== KGC PORTAL SYSTEM =====
    // State Management
    let portalState = {
      isLoggedIn: false,
      role: null,
      userName: '',
      userEmail: '',
      bookings: []
    };

    function loadState() {
      const saved = localStorage.getItem('kgc_user_role');
      if (saved) portalState = JSON.parse(saved);
      const bookings = localStorage.getItem('kgc_bookings');
      if (bookings) portalState.bookings = JSON.parse(bookings);
    }

    function saveState() {
      localStorage.setItem('kgc_user_role', JSON.stringify(portalState));
      localStorage.setItem('kgc_bookings', JSON.stringify(portalState.bookings));
    }

    loadState();

    // ---- Header user indicator ----
    function updateHeaderState() {
      const indicator = document.getElementById('userIndicator');
      const nameEl    = document.getElementById('userIndicatorName');
      if (!indicator) return;
      if (portalState.isLoggedIn) {
        indicator.classList.remove('hidden');
        indicator.classList.add('flex');
        nameEl.textContent = portalState.role === 'admin'
          ? 'âš™ Admin Dashboard'
          : 'ðŸ‘¤ ' + (portalState.userName || 'My Dashboard');
      } else {
        indicator.classList.add('hidden');
        indicator.classList.remove('flex');
      }
    }
    updateHeaderState();

    // ---- Modal helpers ----
    window.openModal = function(id) {
      const el = document.getElementById(id);
      if (el) { el.classList.remove('hidden'); el.classList.add('flex'); document.body.style.overflow = 'hidden'; }
    }
    window.closeModal = function(id) {
      const el = document.getElementById(id);
      if (el) { el.classList.add('hidden'); el.classList.remove('flex'); document.body.style.overflow = 'auto'; }
    }

    // ---- BOOK NOW â€” auth-gated entry point ----
    window.handleBookNow = function() {
      if (portalState.isLoggedIn) {
        if (portalState.role === 'client') {
          window.openBookingDirect();          // already logged in as client â†’ go straight to booking
        } else if (portalState.role === 'admin') {
          window.showAdminDashboard();         // admin â†’ go to admin dashboard
        }
      } else {
        // Not logged in â†’ open auth modal (login flow leads to booking after success)
        window.openModal('authModal');
        window.switchAuthRole('client');       // default to Client Login tab
        window.switchAuthTab('login');
      }
    }

    // ---- Open booking modal directly (pre-fill if logged in) ----
    window.openBookingDirect = function() {
      // Pre-fill name & email from session
      const nameInput  = document.getElementById('bookingFullName');
      const emailInput = document.getElementById('bookingEmail');
      if (nameInput && portalState.userName)  nameInput.value = portalState.userName;
      if (emailInput && portalState.userEmail) emailInput.value = portalState.userEmail;

      // Reset to step 1
      document.getElementById('bookingStep1').classList.remove('hidden');
      document.getElementById('bookingStep2').classList.add('hidden');
      // Uncheck all subsidiaries
      document.querySelectorAll('input[name="subsidiary"]').forEach(cb => cb.checked = false);

      window.openModal('bookingModal');
    }

    // Kept for dashboard "New Booking" button
    window.openBookingModal = window.openBookingDirect;

    // ---- Booking steps ----
    window.nextBookingStep = function() {
      const checked = document.querySelectorAll('input[name="subsidiary"]:checked');
      if (checked.length === 0) { alert('Please select at least one subsidiary.'); return; }
      document.getElementById('bookingStep1').classList.add('hidden');
      document.getElementById('bookingStep2').classList.remove('hidden');
    }
    window.prevBookingStep = function() {
      document.getElementById('bookingStep2').classList.add('hidden');
      document.getElementById('bookingStep1').classList.remove('hidden');
    }

    window.submitBooking = function(e) {
      e.preventDefault();
      const form = e.target;
      const subsidiaries = Array.from(document.querySelectorAll('input[name="subsidiary"]:checked')).map(cb => cb.value);
      const booking = {
        id: 'BK' + Date.now(),
        name: form.fullName.value,
        email: form.email.value,
        phone: form.phone.value,
        date: form.serviceDate.value,
        subsidiaries,
        notes: form.notes.value,
        hytDonation: form.hytDonation.checked,
        status: 'Pending',
        timestamp: new Date().toISOString()
      };
      portalState.bookings.push(booking);
      saveState();
      window.closeModal('bookingModal');
      form.reset();
      alert('âœ… Request Submitted!\n\nReference: ' + booking.id + '\n\nWe will contact you within 24 hours.');
    }

    // ---- Auth modal: role toggle ----
    window.switchAuthRole = function(role) {
      const clientBtn = document.getElementById('roleToggleClient');
      const adminBtn  = document.getElementById('roleToggleAdmin');
      const input     = document.getElementById('loginRoleInput');
      if (!clientBtn || !adminBtn || !input) return;
      if (role === 'client') {
        clientBtn.classList.add('bg-gold', 'text-[#121212]');
        clientBtn.classList.remove('text-gray-400');
        adminBtn.classList.remove('bg-gold', 'text-[#121212]');
        adminBtn.classList.add('text-gray-400');
      } else {
        adminBtn.classList.add('bg-gold', 'text-[#121212]');
        adminBtn.classList.remove('text-gray-400');
        clientBtn.classList.remove('bg-gold', 'text-[#121212]');
        clientBtn.classList.add('text-gray-400');
      }
      input.value = role;
    }

    // ---- Auth modal: tab switching ----
    window.switchAuthTab = function(tab) {
      const loginTab  = document.getElementById('loginTab');
      const regTab    = document.getElementById('registerTab');
      const tabLogin  = document.getElementById('tabLogin');
      const tabReg    = document.getElementById('tabRegister');
      if (!loginTab || !regTab) return;
      if (tab === 'login') {
        loginTab.classList.remove('hidden');
        regTab.classList.add('hidden');
        tabLogin.classList.add('text-gold', 'border-gold');
        tabLogin.classList.remove('text-gray-400', 'border-transparent');
        tabReg.classList.add('text-gray-400', 'border-transparent');
        tabReg.classList.remove('text-gold', 'border-gold');
      } else {
        regTab.classList.remove('hidden');
        loginTab.classList.add('hidden');
        tabReg.classList.add('text-gold', 'border-gold');
        tabReg.classList.remove('text-gray-400', 'border-transparent');
        tabLogin.classList.add('text-gray-400', 'border-transparent');
        tabLogin.classList.remove('text-gold', 'border-gold');
      }
    }

    // ---- Login â€” routes clientâ†’booking, adminâ†’dashboard ----
    window.handleLogin = function(e) {
      e.preventDefault();
      const form     = e.target;
      const email    = form.loginEmail.value.trim();
      const password = form.loginPassword.value;
      const role     = document.getElementById('loginRoleInput').value;

      const valid = password === 'password' && (
        (role === 'client' && email === 'client@kgc.ph') ||
        (role === 'admin'  && email === 'admin@kgc.ph')
      );

      if (!valid) {
        alert('Invalid credentials. Please check your email, password, and selected role.');
        return;
      }

      portalState.isLoggedIn = true;
      portalState.role       = role;
      portalState.userName   = role === 'client' ? 'Client User' : 'Admin User';
      portalState.userEmail  = email;
      saveState();
      updateHeaderState();
      window.closeModal('authModal');
      form.reset();

      if (role === 'client') {
        window.openBookingDirect();    // client â†’ straight to booking
      } else {
        window.showAdminDashboard();   // admin â†’ admin dashboard
      }
    }

    // ---- Register ----
    window.handleRegister = function(e) {
      e.preventDefault();
      alert('Account request submitted!\n\nWe will review your details and contact you within 24 hours.');
      window.closeModal('authModal');
      e.target.reset();
    }

    // ---- Dashboards ----
    window.goToDashboard = function() {
      if (portalState.role === 'admin') window.showAdminDashboard();
      else window.showClientDashboard();
    }

    window.showClientDashboard = function() {
      document.getElementById('scroll-container').style.display = 'none';
      document.getElementById('clientDashboard').classList.remove('hidden');
      document.getElementById('clientName').textContent = portalState.userName;
      window.scrollTo(0, 0);
    }

    window.showAdminDashboard = function() {
      document.getElementById('scroll-container').style.display = 'none';
      document.getElementById('adminDashboard').classList.remove('hidden');
      window.renderBookingTable();
      window.scrollTo(0, 0);
    }

    window.renderBookingTable = function() {
      const tbody = document.getElementById('bookingTableBody');
      if (!tbody) return;
      const pending = document.getElementById('pendingCount');
      if (pending) pending.textContent = portalState.bookings.filter(b => b.status === 'Pending').length;
      if (portalState.bookings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-gray-400">No bookings yet</td></tr>';
        return;
      }
      tbody.innerHTML = portalState.bookings.map(b => `
        <tr class="border-b border-gray-800 hover:bg-[#121212]/60">
          <td class="py-3 px-4 text-white">${b.name}</td>
          <td class="py-3 px-4 text-gray-300 text-sm">${b.subsidiaries.join(', ')}</td>
          <td class="py-3 px-4 text-gray-300 text-sm">${b.date}</td>
          <td class="py-3 px-4">
            <span class="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-600/20 text-yellow-400 border border-yellow-600/30">
              ${b.status}
            </span>
          </td>
          <td class="py-3 px-4">
            <button onclick="window.viewBooking('${b.id}')" class="text-gold text-sm hover:underline">View</button>
          </td>
        </tr>
      `).join('');
    }

    window.viewBooking = function(id) {
      const b = portalState.bookings.find(x => x.id === id);
      if (b) alert('Booking ' + b.id + '\n\nClient: ' + b.name + '\nEmail: ' + b.email + '\nDate: ' + b.date + '\nServices: ' + b.subsidiaries.join(', ') + '\nNotes: ' + (b.notes || 'â€”') + '\nHYT Donation: ' + (b.hytDonation ? 'Yes' : 'No'));
    }

    // ---- Logout â€” clears session and refreshes header ----
    window.logout = function() {
      if (!confirm('Log out of your KGC account?')) return;
      portalState.isLoggedIn = false;
      portalState.role       = null;
      portalState.userName   = '';
      portalState.userEmail  = '';
      saveState();
      updateHeaderState();
      document.getElementById('clientDashboard').classList.add('hidden');
      document.getElementById('adminDashboard').classList.add('hidden');
      document.getElementById('scroll-container').style.display = 'block';
      window.scrollTo(0, 0);
    }

    // ---- BOOK NOW â€” auth-gated entry point ----
    window.handleBookNow = function() {
      if (portalState.isLoggedIn) {
        if (portalState.role === 'client') {
          window.openBookingDirect();
        } else if (portalState.role === 'admin') {
          window.showAdminDashboard();
        }
      } else {
        window.openModal('authModal');
        window.switchAuthRole('client');
        window.switchAuthTab('login');
      }
    }

    // ---- Open booking modal (pre-fill from session) ----
    window.openBookingDirect = function() {
      var nameInput  = document.getElementById('bookingFullName');
      var emailInput = document.getElementById('bookingEmail');
      if (nameInput  && portalState.userName)  nameInput.value  = portalState.userName;
      if (emailInput && portalState.userEmail) emailInput.value = portalState.userEmail;
      document.getElementById('bookingStep1').classList.remove('hidden');
      document.getElementById('bookingStep2').classList.add('hidden');
      document.querySelectorAll('input[name="subsidiary"]').forEach(function(cb){ cb.checked = false; });
      window.openModal('bookingModal');
    }

    window.openBookingModal = window.openBookingDirect;

    // ---- Booking steps ----
    window.nextBookingStep = function() {
      var checked = document.querySelectorAll('input[name="subsidiary"]:checked');
      if (checked.length === 0) { alert('Please select at least one subsidiary.'); return; }
      document.getElementById('bookingStep1').classList.add('hidden');
      document.getElementById('bookingStep2').classList.remove('hidden');
    }

    window.prevBookingStep = function() {
      document.getElementById('bookingStep2').classList.add('hidden');
      document.getElementById('bookingStep1').classList.remove('hidden');
    }

    window.submitBooking = function(e) {
      e.preventDefault();
      var form = e.target;
      var subsidiaries = Array.from(document.querySelectorAll('input[name="subsidiary"]:checked')).map(function(cb){ return cb.value; });
      var booking = {
        id: 'BK' + Date.now(),
        name: form.fullName.value,
        email: form.email.value,
        phone: form.phone.value,
        date: form.serviceDate.value,
        subsidiaries: subsidiaries,
        notes: form.notes.value,
        hytDonation: form.hytDonation.checked,
        status: 'Pending',
        timestamp: new Date().toISOString()
      };
      portalState.bookings.push(booking);
      saveState();
      window.closeModal('bookingModal');
      form.reset();
      alert('Booking Submitted!\n\nReference: ' + booking.id + '\nWe will contact you within 24 hours.');
    }

    // ---- Auth role toggle ----
    window.switchAuthRole = function(role) {
      var clientBtn = document.getElementById('roleToggleClient');
      var adminBtn  = document.getElementById('roleToggleAdmin');
      var input     = document.getElementById('loginRoleInput');
      if (!clientBtn || !adminBtn || !input) return;
      input.value = role;
      if (role === 'client') {
        clientBtn.classList.add('bg-gold','text-[#121212]');    clientBtn.classList.remove('text-gray-400');
        adminBtn.classList.remove('bg-gold','text-[#121212]');  adminBtn.classList.add('text-gray-400');
      } else {
        adminBtn.classList.add('bg-gold','text-[#121212]');     adminBtn.classList.remove('text-gray-400');
        clientBtn.classList.remove('bg-gold','text-[#121212]'); clientBtn.classList.add('text-gray-400');
      }
    }

    // ---- Auth tab switch ----
    window.switchAuthTab = function(tab) {
      var loginTab = document.getElementById('loginTab');
      var regTab   = document.getElementById('registerTab');
      var tabLogin = document.getElementById('tabLogin');
      var tabReg   = document.getElementById('tabRegister');
      if (!loginTab || !regTab) return;
      if (tab === 'login') {
        loginTab.classList.remove('hidden'); regTab.classList.add('hidden');
        if (tabLogin) { tabLogin.classList.add('text-gold','border-gold'); tabLogin.classList.remove('text-gray-400','border-transparent'); }
        if (tabReg)   { tabReg.classList.add('text-gray-400','border-transparent'); tabReg.classList.remove('text-gold','border-gold'); }
      } else {
        regTab.classList.remove('hidden'); loginTab.classList.add('hidden');
        if (tabReg)   { tabReg.classList.add('text-gold','border-gold'); tabReg.classList.remove('text-gray-400','border-transparent'); }
        if (tabLogin) { tabLogin.classList.add('text-gray-400','border-transparent'); tabLogin.classList.remove('text-gold','border-gold'); }
      }
    }

    // ---- Login â€” client goes to booking, admin goes to dashboard ----
    window.handleLogin = function(e) {
      e.preventDefault();
      var form     = e.target;
      var email    = form.loginEmail.value.trim();
      var password = form.loginPassword.value;
      var role     = document.getElementById('loginRoleInput').value;

      var valid = (password === 'password') && (
        (role === 'client' && email === 'client@kgc.ph') ||
        (role === 'admin'  && email === 'admin@kgc.ph')
      );

      if (!valid) {
        alert('Invalid credentials. Check your email, password, and selected role.');
        return;
      }

      portalState.isLoggedIn = true;
      portalState.role       = role;
      portalState.userName   = role === 'client' ? 'Client User' : 'Admin User';
      portalState.userEmail  = email;
      saveState();
      updateHeaderState();
      window.closeModal('authModal');
      form.reset();

      if (role === 'client') {
        window.openBookingDirect();   // logged in as client â†’ open booking immediately
      } else {
        window.showAdminDashboard();  // logged in as admin â†’ open admin dashboard
      }
    }

    // ---- Register ----
    window.handleRegister = function(e) {
      e.preventDefault();
      alert('Account request submitted!\nWe will review your details and contact you within 24 hours.');
      window.closeModal('authModal');
      e.target.reset();
    }

    // ---- Dashboard routing ----
    window.goToDashboard = function() {
      if (portalState.role === 'admin') window.showAdminDashboard();
      else window.showClientDashboard();
    }

    window.showClientDashboard = function() {
      document.getElementById('scroll-container').style.display = 'none';
      document.getElementById('clientDashboard').classList.remove('hidden');
      var n = document.getElementById('clientName');
      if (n) n.textContent = portalState.userName;
      window.scrollTo(0, 0);
    }

    window.showAdminDashboard = function() {
      document.getElementById('scroll-container').style.display = 'none';
      document.getElementById('adminDashboard').classList.remove('hidden');
      window.renderBookingTable();
      window.scrollTo(0, 0);
    }

    window.renderBookingTable = function() {
      var tbody = document.getElementById('bookingTableBody');
      if (!tbody) return;
      var pending = document.getElementById('pendingCount');
      if (pending) pending.textContent = portalState.bookings.filter(function(b){ return b.status === 'Pending'; }).length;
      if (portalState.bookings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-gray-400">No bookings yet</td></tr>';
        return;
      }
      tbody.innerHTML = portalState.bookings.map(function(b) {
        return '<tr class="border-b border-gray-800 hover:bg-gray-900">' +
          '<td class="py-3 px-4 text-white">'   + b.name + '</td>' +
          '<td class="py-3 px-4 text-gray-300 text-sm">' + b.subsidiaries.join(', ') + '</td>' +
          '<td class="py-3 px-4 text-gray-300 text-sm">' + b.date + '</td>' +
          '<td class="py-3 px-4"><span class="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-600/20 text-yellow-400 border border-yellow-600/30">' + b.status + '</span></td>' +
          '<td class="py-3 px-4"><button onclick="window.viewBooking(\'' + b.id + '\')" class="text-gold text-sm hover:underline">View</button></td>' +
          '</tr>';
      }).join('');
    }

    window.viewBooking = function(id) {
      var b = portalState.bookings.find(function(x){ return x.id === id; });
      if (b) alert('Booking: ' + b.id + '\nClient: ' + b.name + '\nEmail: ' + b.email + '\nDate: ' + b.date + '\nServices: ' + b.subsidiaries.join(', ') + '\nNotes: ' + (b.notes || '-') + '\nHYT Donation: ' + (b.hytDonation ? 'Yes' : 'No'));
    }

  </script>
