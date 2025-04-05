const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 🔐 Login do usuário
async function login(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    alert('Login error: ' + error.message);
    return false;
  }

  alert('Login Success!');
  console.log('User authenticated:', data.user);
  return true;
}

// 📤 Upload da imagem para 'spaces/'
async function uploadImage() {
  const session = await supabaseClient.auth.getSession();

  if (!session.data.session) {
    alert('Você precisa estar logado para enviar uma imagem.');
    return;
  }

  console.log('Sessão ativa:', session.data.session);

  const fileInput = document.getElementById('fileInput');
  const file = fileInput.files[0];

  if (!file) {
    alert('Selecione um arquivo!');
    return;
  }

  const fileName = `${Date.now()}-${file.name}`;
  const filePath = `spaces/${fileName}`;

  const { data, error } = await supabaseClient
    .storage
    .from('workspaces')
    .upload(filePath, file);

  if (error) {
    console.error('Erro no upload:', error);
    alert('Erro ao enviar imagem: ' + error.message);
    return;
  }

  console.log('Upload realizado com sucesso:', data);

  const { data: publicUrlData } = supabaseClient
    .storage
    .from('workspaces')
    .getPublicUrl(filePath);

  const imageUrl = publicUrlData.publicUrl;

  console.log('URL pública:', imageUrl);

  document.getElementById('preview').innerHTML = `
    <p>Imagem enviada com sucesso:</p>
    <img src="${imageUrl}" width="200" />
    <p><a href="${imageUrl}" target="_blank">Ver imagem</a></p>
  `;
}

// 🎯 Botão de login
async function handleLogin() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  await login(email, password);
}



// 🔐 Logout do usuário
async function logout() {
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    alert('Erro ao sair: ' + error.message);
    console.error(error);
  } else {
    alert('Logout realizado com sucesso!');
    console.log('Sessão encerrada.');
    document.getElementById('preview').innerHTML = '';
  }
}




// Inicialização do Supabase
// Função para buscar workspaces do Supabase e exibir na tabela
async function fetchWorkspaces() {
    // Fazer a consulta na tabela 'workspaces'
    const { data, error } = await supabaseClient
        .from('workspaces')
        .select('*'); // Seleciona todas as colunas, você pode filtrar conforme necessário

    if (error) {
        console.error('Erro ao buscar workspaces:', error);
        return;
    }

    // Preencher a tabela com os dados recebidos
    const tableBody = document.getElementById('workspaces-table').getElementsByTagName('tbody')[0];

    // Limpar a tabela antes de adicionar novos dados
    tableBody.innerHTML = '';

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
}

// Chamar a função para carregar os dados quando a página for carregada
window.onload = fetchWorkspaces;
