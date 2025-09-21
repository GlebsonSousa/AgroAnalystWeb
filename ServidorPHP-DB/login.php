<?php
// ARQUIVO: login.php (Versão Final com Banco de Dados)

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'conexao.php';

$email = isset($_POST['email']) ? trim($_POST['email']) : '';
$senha = isset($_POST['senha']) ? trim($_POST['senha']) : '';

// 1. Validação dos dados
if (empty($email) || empty($senha)) {
    http_response_code(400);
    echo json_encode(['erro' => "Dados incompletos. 'email' e 'senha' são obrigatórios."]);
    exit();
}

// 2. Buscar o usuário pelo e-mail
$sql = "SELECT id, usuario, email, senha FROM usuarios WHERE email = ?";
$stmt = mysqli_prepare($conexao, $sql);
mysqli_stmt_bind_param($stmt, "s", $email);
mysqli_stmt_execute($stmt);
$resultado = mysqli_stmt_get_result($stmt);
$usuario_encontrado = mysqli_fetch_assoc($resultado);

// 3. Verificar se o usuário existe e se a senha está correta
if ($usuario_encontrado && password_verify($senha, $usuario_encontrado['senha'])) {
    // Senha correta! Login bem-sucedido.
    http_response_code(200); // OK
    echo json_encode([
        'msg' => "Login realizado com sucesso!",
        'usuario' => [
            'id' => $usuario_encontrado['id'],
            'nome' => $usuario_encontrado['usuario'],
            'email' => $usuario_encontrado['email']
        ]
    ]);
} else {
    // Usuário não encontrado ou senha incorreta
    http_response_code(401); // Unauthorized
    echo json_encode(['erro' => "E-mail ou senha incorretos."]);
}

mysqli_stmt_close($stmt);
mysqli_close($conexao);
?>