document.addEventListener('DOMContentLoaded', () => {
    const svgContainer = document.getElementById('svg-container');
    if (svgContainer) {
        fetch('_partials/svg-symbols.html')
            .then(response => response.text())
            .then(data => {
                svgContainer.innerHTML = data;
            });
    }
});
