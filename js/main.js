/* ==========================================================================
   js/main.js - Landing Page Interactions & Smooth Scrolling
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // Smooth scrolling for navigation links
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            const targetId = link.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    console.log('⚡ Data Commerce Challenge landing page loaded successfully.');
});
