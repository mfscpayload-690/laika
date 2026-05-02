// ============================================================
// Laika Music — Landing Page Script
// ============================================================

// ---------- Deep link / hash routing on load ----------
// Scroll to the correct section if a hash is present in the URL
function handleInitialHash() {
    const hash = window.location.hash;
    if (hash) {
        const target = document.querySelector(hash);
        if (target) {
            // Small delay so the page renders first
            setTimeout(() => {
                target.scrollIntoView({ behavior: 'smooth' });
            }, 120);
        }
    }
}

window.addEventListener('DOMContentLoaded', handleInitialHash);

// Update URL hash on scroll (pushState-based deep links)
const sections = document.querySelectorAll('section[id], header[id]');
let ticking = false;

function updateHashOnScroll() {
    if (!ticking) {
        requestAnimationFrame(() => {
            const scrollY = window.scrollY + 120;
            let current = '';
            sections.forEach(section => {
                if (section.offsetTop <= scrollY) {
                    current = section.id;
                }
            });
            if (current && window.location.hash !== `#${current}`) {
                history.replaceState(null, '', `#${current}`);
            }
            ticking = false;
        });
        ticking = true;
    }
}

window.addEventListener('scroll', updateHashOnScroll, { passive: true });

// ---------- Nav: add "scrolled" class on scroll ----------
const nav = document.getElementById('main-nav');

let navTicking = false;

function handleNavScroll() {
    if (!navTicking) {
        requestAnimationFrame(() => {
            if (window.scrollY > 20) {
                nav.classList.add('scrolled');
            } else {
                nav.classList.remove('scrolled');
            }
            navTicking = false;
        });
        navTicking = true;
    }
}

window.addEventListener('scroll', handleNavScroll, { passive: true });
handleNavScroll(); // run once on load

// ---------- Scroll Reveal Animations ----------
const reveals = document.querySelectorAll('.reveal');

const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
        }
    });
}, { threshold: 0.1 });

reveals.forEach(el => revealObserver.observe(el));

// ---------- Smooth scroll for anchor links ----------
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        const target = document.querySelector(href);
        if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth' });
            // Update URL without triggering a page reload
            history.pushState(null, '', href);
        }
    });
});

// ---------- Initialize Lucide Icons ----------
lucide.createIcons();
