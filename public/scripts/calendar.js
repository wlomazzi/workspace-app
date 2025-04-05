document.addEventListener("DOMContentLoaded", function() {
    flatpickr("#date-range", {
        mode: "range", // Permite selecionar um intervalo de datas
        dateFormat: "M j, Y", // Formato do texto exibido
        minDate: "today", // Não permite selecionar datas passadas
        showMonths: 2 // Exibe dois meses lado a lado
    });
});
