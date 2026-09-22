// ========================================
// GSAP ANIMATIONS - Klassic Group Hub
// ========================================

function initAnimations() {
  
  // Hero Section Animations
  const heroTl = gsap.timeline({ delay: 0.5 });
  
  heroTl
    .to('.hero-badge', { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' })
    .to('.hero-title', { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }, '-=0.4')
    .to('.hero-subtitle', { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }, '-=0.6')
    .to('.hero-cta', { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, '-=0.5')
    .to('.scroll-indicator', { opacity: 1, duration: 0.6 }, '-=0.3');
  
  // Section Header
  gsap.from('.section-header', {
    scrollTrigger: {
      trigger: '.section-header',
      start: 'top 80%',
      toggleActions: 'play none none none'
    },
    opacity: 0,
    y: 60,
    duration: 1,
    ease: 'power3.out'
  });
  
  // Company Cards - Stagger Animation
  const cards = document.querySelectorAll('.company-card');
  
  cards.forEach((card, index) => {
    const visualIcon = card.querySelector('.visual-icon');
    
    gsap.to(card, {
      scrollTrigger: {
        trigger: card,
        start: 'top 85%',
        end: 'top 30%',
        toggleActions: 'play none none reverse',
        onEnter: () => {
          card.style.opacity = '1';
          card.style.transform = 'translateY(0) scale(1)';
        }
      },
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 1.2,
      ease: 'power3.out'
    });
    
    // Animate visual icons
    if (visualIcon) {
      gsap.to(visualIcon, {
        scrollTrigger: {
          trigger: card,
          start: 'top 75%',
          toggleActions: 'play none none reverse'
        },
        opacity: 1,
        scale: 1,
        rotation: 360,
        duration: 1.5,
        ease: 'elastic.out(1, 0.5)',
        delay: 0.3
      });
    }
    
    // Parallax effect on scroll
    gsap.to(card, {
      scrollTrigger: {
        trigger: card,
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1
      },
      y: -50,
      ease: 'none'
    });
  });
  
  // Footer particle fade
  gsap.to('#footer', {
    scrollTrigger: {
      trigger: '#footer',
      start: 'top center',
      end: 'bottom bottom',
      scrub: 1
    },
    opacity: 1,
    ease: 'none'
  });
  
  // Magnetic button effect enhanced
  const magneticButtons = document.querySelectorAll('.magnetic-btn');
  
  magneticButtons.forEach(btn => {
    btn.addEventListener('mouseenter', (e) => {
      gsap.to(btn, {
        scale: 1.05,
        duration: 0.3,
        ease: 'power2.out'
      });
    });
    
    btn.addEventListener('mouseleave', (e) => {
      gsap.to(btn, {
        scale: 1,
        x: 0,
        y: 0,
        duration: 0.3,
        ease: 'elastic.out(1, 0.3)'
      });
    });
    
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      
      gsap.to(btn, {
        x: x * 0.3,
        y: y * 0.3,
        duration: 0.3,
        ease: 'power2.out'
      });
    });
  });
}

// ========================================
// LOADING SCREEN
// ========================================

function hideLoader() {
  const loader = document.getElementById('loader');
  gsap.to(loader, {
    opacity: 0,
    duration: 0.5,
    onComplete: () => {
      loader.classList.add('hidden');
    }
  });
}

// ========================================
// INITIALIZE ON LOAD
// ========================================

window.addEventListener('load', () => {
  setTimeout(() => {
    hideLoader();
    initAnimations();
  }, 1500);
});

// ========================================
// RESIZE HANDLER
// ========================================

window.addEventListener('resize', () => {
  if (camera && renderer) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  ScrollTrigger.refresh();
});

// ========================================
// SMOOTH SCROLL FOR ANCHOR LINKS
// ========================================

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    
    if (target) {
      gsap.to(window, {
        duration: 1.5,
        scrollTo: {
          y: target,
          offsetY: 0
        },
        ease: 'power3.inOut'
      });
    }
  });
});
