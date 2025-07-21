// --- PASTE THIS NEW CODE INTO js/partials-loader.js ---
document.addEventListener('DOMContentLoaded', () => {
    const svgContainer = document.getElementById('svg-container');
    if (svgContainer) {
        // This new path starts with a "/" to look from the website's root directory.
        // This is a more reliable way to find the file.
        fetch('/_partials/svg-symbols.html')
            .then(response => {
                if (!response.ok) {
                    console.error("CRITICAL ERROR: Could not load the icons file. Check the path and make sure the file exists at /_partials/svg-symbols.html");
                }
                return response.text();
            })
            .then(data => {
                svgContainer.innerHTML = data;
            });
    }
});
