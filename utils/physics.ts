
// Simple gravity simulation utility for "falling" DOM elements
export const triggerGravityEffect = (elementIds: string[]) => {
    elementIds.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;

        // Initial state
        let y = 0;
        let x = 0;
        let vy = 0;
        let vx = (Math.random() - 0.5) * 10; // Random horizontal velocity
        let rotation = 0;
        let vr = (Math.random() - 0.5) * 20; // Random rotation velocity
        const gravity = 0.8;
        const bounce = 0.6;
        const floor = window.innerHeight + 100; // Just below screen

        // Detach from layout flow roughly
        const rect = el.getBoundingClientRect();
        el.style.position = 'fixed';
        el.style.left = `${rect.left}px`;
        el.style.top = `${rect.top}px`;
        el.style.width = `${rect.width}px`;
        el.style.zIndex = '100';
        el.style.pointerEvents = 'none';

        const animate = () => {
            vy += gravity;
            y += vy;
            x += vx;
            rotation += vr;

            // Floor collision (optional bounce)
            if (rect.top + y > floor) {
                // "Shatter" / Fade out quickly once it hits bottom
                el.style.transition = 'opacity 0.2s, transform 0.2s';
                el.style.opacity = '0';
                el.style.transform = `scale(0)`;
                setTimeout(() => el.remove(), 200);
                return;
            }

            el.style.transform = `translate(${x}px, ${y}px) rotate(${rotation}deg)`;
            requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);
    });
};
