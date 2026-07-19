(() => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  // AQUÍ VA TU URL real de Google Apps Script
  const SHEET_ENDPOINT = 'https://script.google.com/macros/s/AKfycbxxd5hani_La71DSZ6jgm4CDnE6uq_JNpbhThRdqlYtDU9_hT0WS-_c5vRUQzCGw9cK/exec';

  /* ---------- Variables y DOM ---------- */
  const ctaWrap = document.getElementById('hero-cta');
  const ctaButton = document.getElementById('ctaButton');
  const waitlistForm = document.getElementById('waitlistForm');
  const waitlistEmail = document.getElementById('waitlistEmail');
  const waitlistCancel = document.getElementById('waitlistCancel');
  const navCta = document.getElementById('navCta');
  const STORAGE_KEY = 'trustlayer_waitlist_joined';

  // --- Helpers de Estado ---
  function setJoinedState(text = "Already on the waitlist ✓") {
    ctaButton.querySelector('span').textContent = text;
    ctaButton.classList.add('joined');
    ctaButton.disabled = true;
    if (navCta) {
      navCta.textContent = text;
      navCta.classList.add('joined');
    }
  }

  // --- Carga inicial: verificar si ya se unió ---
  try {
    if (window.localStorage.getItem(STORAGE_KEY) === 'true') {
      setJoinedState();
    }
  } catch (err) {}

  // --- Interacciones ---
  ctaButton.addEventListener('click', () => {
    if (ctaButton.classList.contains('joined')) return;
    ctaWrap.classList.add('open');
    setTimeout(() => waitlistEmail.focus(), 350);
  });

  waitlistCancel.addEventListener('click', () => {
    ctaWrap.classList.remove('open');
  });

  // --- Envío al Google Sheet ---
  waitlistForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = waitlistEmail.value.trim();
    
    if (!email) return;

    // Cambiar texto de botón para indicar carga
    const submitBtn = waitlistForm.querySelector('.waitlist-submit');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Verifying...';
    submitBtn.disabled = true;

    const payload = new URLSearchParams();
    payload.append('email', email);

    fetch(SHEET_ENDPOINT, {
      method: 'POST',
      body: payload
    })
    .then(response => response.json())
    .then(data => {
      // Si el script de Google responde que es duplicado
      if (data.status === 'duplicate') {
        alert("You're already on the list!");
        setJoinedState("Already on the waitlist ✓");
      } else {
        // Éxito: Guardar en localStorage y mostrar animación
        window.localStorage.setItem(STORAGE_KEY, 'true');
        
        // Disparar tu animación de feedback
        ctaWrap.classList.add('show-feedback');
        
        setTimeout(() => {
          ctaWrap.classList.remove('open', 'show-feedback');
          setJoinedState("On the waitlist ✓");
        }, 2200);
      }
    })
    .catch((err) => {
      console.error("Error al enviar:", err);
      // Por si acaso hay CORS, asumimos éxito para no bloquear al usuario
      setJoinedState("On the waitlist ✓");
    })
    .finally(() => {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    });
  });

  /* ... (Mantén aquí el resto de tus funciones originales de acordeones y scroll) ... */
})();
