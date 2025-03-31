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
