document.getElementById("spaceForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    const formData = new FormData(this); // Criar FormData para enviar arquivos e texto

    const response = await fetch("http://localhost:3000/api/spaces", {
        method: "POST",
        body: formData  // Enviando dados como `multipart/form-data`
    });

    const result = await response.json();

    if (result.success) {
        alert("Space successful added!");
        window.location.href = "index.html";  // Redirect to index page
    } else {
        alert("Error to insert the Space: " + result.message);
    }
});
