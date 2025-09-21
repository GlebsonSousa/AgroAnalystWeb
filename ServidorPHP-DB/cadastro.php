<?php
// ARQUIVO: cadastro.php (Versão Final com Banco de Dados)

// Cabeçalhos de permissão CORS
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Responde a requisições OPTIONS (verificação de CORS do navegador)
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Inclui a lógica de conexão com o banco
require_once 'conexao.php';

// Pega os dados enviados pelo frontend no formato x-www-form-urlencoded
$usuario = isset($_POST['usuario']) ? trim($_POST['usuario']) : '';
$email = isset($_POST['email']) ? trim($_POST['email']) : '';
$senha = isset($_POST['senha']) ? trim($_POST['senha']) : '';

// 1. Validação dos dados
if (empty($usuario) || empty($email) || empty($senha)) {
    http_response_code(400); // Bad Request
    echo json_encode(['erro' => "Dados incompletos. 'usuario', 'email' e 'senha' são obrigatórios."]);
    exit();
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['erro' => "Formato de e-mail inválido."]);
    exit();
}

// 2. Verificar se o e-mail já existe no banco
$sql_verifica = "SELECT id FROM usuarios WHERE email = ?";
$stmt_verifica = mysqli_prepare($conexao, $sql_verifica);
mysqli_stmt_bind_param($stmt_verifica, "s", $email);
mysqli_stmt_execute($stmt_verifica);
mysqli_stmt_store_result($stmt_verifica);

if (mysqli_stmt_num_rows($stmt_verifica) > 0) {
    http_response_code(409); // Conflict
    echo json_encode(['erro' => "Este e-mail já está cadastrado."]);
    mysqli_stmt_close($stmt_verifica);
    mysqli_close($conexao);
    exit();
}
mysqli_stmt_close($stmt_verifica);

// 3. Criptografar a senha (Segurança Essencial)
$senha_criptografada = password_hash($senha, PASSWORD_BCRYPT);

// 4. Inserir o novo usuário no banco
$sql_insere = "INSERT INTO usuarios (usuario, email, senha) VALUES (?, ?, ?)";
$stmt_insere = mysqli_prepare($conexao, $sql_insere);
mysqli_stmt_bind_param($stmt_insere, "sss", $usuario, $email, $senha_criptografada);

if (mysqli_stmt_execute($stmt_insere)) {
    http_response_code(201); // Created
    echo json_encode(['msg' => "Usuário cadastrado com sucesso!"]);
} else {
    http_response_code(500); // Internal Server Error
    echo json_encode(['erro' => "Ocorreu um erro no servidor ao tentar cadastrar o usuário."]);
}

mysqli_stmt_close($stmt_insere);
mysqli_close($conexao);
?>