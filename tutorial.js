/* tutorial.js
   Maneja la lógica de la ventana modal de ayuda/instrucciones.
*/

document.addEventListener('DOMContentLoaded', () => {
    // Referencias a los elementos del DOM
    const helpBtn = document.getElementById('helpBtn');
    const tutorialOverlay = document.getElementById('tutorial-overlay');
    const closeBtn = document.querySelector('.btn-close-tutorial');

    // Validación por seguridad (si no existen los elementos, no hace nada)
    if (!helpBtn || !tutorialOverlay) return;

    // --- FUNCIONES ---

    // 1. Abrir el tutorial
    helpBtn.addEventListener('click', () => {
        tutorialOverlay.style.display = 'flex';
        // Opcional: Agregar clase para animaciones si deseas
        // tutorialOverlay.classList.add('fade-in');
    });

    // 2. Cerrar con el botón X
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            closeTutorial();
        });
    }

    // 3. Cerrar haciendo clic fuera del contenido (en el fondo oscuro)
    window.addEventListener('click', (e) => {
        if (e.target === tutorialOverlay) {
            closeTutorial();
        }
    });

    // 4. Cerrar con la tecla ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && tutorialOverlay.style.display === 'flex') {
            closeTutorial();
        }
    });

    function closeTutorial() {
        tutorialOverlay.style.display = 'none';
    }
});