document.addEventListener("DOMContentLoaded", function () {
    fetch("/components/footer.html") // Footer path
        .then(response => response.text())
        .then(html => {
            const footerContainer = document.createElement("div");
            footerContainer.innerHTML = html;
            document.body.appendChild(footerContainer); // Add at the end of <body>
        })
        .catch(error => console.error("Error loading footer:", error));
});
