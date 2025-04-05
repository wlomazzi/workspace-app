async function fetchWorkspaces() {
    try {
        const response = await fetch('/api/spaces/workspaces');
        if (!response.ok) throw new Error('Erro ao buscar workspaces');
        const data = await response.json();
    
        const tableBody = document.getElementById('workspaces-table').getElementsByTagName('tbody')[0];
        tableBody.innerHTML = ''; // Limpar a tabela antes de adicionar novos dados
    
        data.forEach(workspace => {
            const row = tableBody.insertRow();
    
            const cellId = row.insertCell(0);
            const cellName = row.insertCell(1);
            const cellAddress = row.insertCell(2);
            const cellPrice = row.insertCell(3);
            const cellCapacity = row.insertCell(4);
    
            cellId.textContent = workspace.id;
            cellName.textContent = workspace.title;
            cellAddress.textContent = workspace.location;
            cellPrice.textContent = workspace.price_per_hour;
            cellCapacity.textContent = workspace.description;
        });
    } catch (error) {
      console.error('Erro ao buscar workspaces:', error);
    }
  }
  
  window.onload = fetchWorkspaces;
  