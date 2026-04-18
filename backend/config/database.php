<?php

define('DB_HOST', 'sql104.infinityfree.com');
define('DB_USER', 'if0_41692289');
define('DB_PASS', 'NvTs7W44fY');
define('DB_NAME', 'if0_41692289_sales_intelligence');
define('ML_SERVICE_URL', 'http://localhost:5000');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }
class Database {
    private static $instance = null;
    private $conn;

    private function __construct() {
        $this->conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        if ($this->conn->connect_error) {
            die(json_encode(['error' => 'DB Connection failed: ' . $this->conn->connect_error]));
        }
        $this->conn->set_charset('utf8mb4');
    }

    public static function getInstance() {
        if (!self::$instance) self::$instance = new Database();
        return self::$instance;
    }

    public function getConnection() { return $this->conn; }

    public function query($sql, $params = [], $types = '') {
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) return [];
        if ($params) $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $result = $stmt->get_result();
        return $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
    }

    public function execute($sql, $params = [], $types = '') {
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) return false;
        if ($params) $stmt->bind_param($types, ...$params);
        return $stmt->execute();
    }
}

function sendJSON($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data);
    exit;
}

function getMLPrediction($endpoint, $data) {
    if (!function_exists('curl_init')) return null;
    $ch = curl_init(ML_SERVICE_URL . $endpoint);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($data),
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 5,
        CURLOPT_CONNECTTIMEOUT => 3,
    ]);
    $response = curl_exec($ch);
    $err = curl_error($ch);
    curl_close($ch);
    if ($err || !$response) return null;
    return json_decode($response, true);
}
?>
