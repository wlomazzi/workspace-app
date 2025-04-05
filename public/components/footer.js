// Autor: Gabriel Henrique Campos Scalici
document.addEventListener("DOMContentLoaded", function () {
    fetch("/components/footer.html") // Caminho do footer
        .then(response => response.text())
        .then(html => {
            const footerContainer = document.createElement("div");
            footerContainer.innerHTML = html;
            document.body.appendChild(footerContainer); // Adiciona no final do <body>
        })
        .catch(error => console.error("Error loading footer:", error));
});
