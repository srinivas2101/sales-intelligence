<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") { http_response_code(200); exit(0); }

require_once '../config/database.php';
$db = Database::getInstance();

// Build alerts same as notifications.php
$alerts = [];

// Low stock alerts
$lowStock = $db->query("SELECT name, stock, reorder_point FROM products WHERE stock < reorder_point AND stock > 0 ORDER BY (stock/reorder_point) ASC LIMIT 5");
foreach ($lowStock as $p) {
  $alerts[] = [
    'title' => '📦 Low Stock Alert',
    'message' => "{$p['name']} — only {$p['stock']} units left!",
    'type' => 'stock'
  ];
}

// Out of stock
$oos = $db->query("SELECT name FROM products WHERE stock=0 LIMIT 3");
foreach ($oos as $p) {
  $alerts[] = [
    'title' => '🚨 Out of Stock',
    'message' => "{$p['name']} — 0 units remaining!",
    'type' => 'critical'
  ];
}

// Expiry alerts
$expiry = $db->query("SELECT name, expiry_days FROM products WHERE stock>0 AND expiry_days<=7 AND expiry_days IS NOT NULL ORDER BY expiry_days ASC LIMIT 5");
foreach ($expiry as $p) {
  $alerts[] = [
    'title' => '⏰ Expiry Alert',
    'message' => "{$p['name']} expires in {$p['expiry_days']} day(s)!",
    'type' => 'expiry'
  ];
}

// Today revenue
$todayRev = $db->query("SELECT SUM(total_amount) as t FROM sales WHERE sale_date=CURDATE()");
$rev = floatval($todayRev[0]['t'] ?? 0);
if ($rev > 0) {
  $alerts[] = [
    'title' => '💰 Daily Revenue',
    'message' => "Today's sales: ₹" . number_format($rev, 0),
    'type' => 'revenue'
  ];
}

// Firebase credentials
$serviceAccountPath = __DIR__ . '/../serviceAccountKey.json';
$serviceAccount = json_decode(file_get_contents($serviceAccountPath), true);
$projectId = $serviceAccount['project_id'];

// Get Firebase access token
function getFirebaseToken($serviceAccount) {
  $now = time();
  $header = base64_encode(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
  $payload = base64_encode(json_encode([
    'iss' => $serviceAccount['client_email'],
    'scope' => 'https://www.googleapis.com/auth/datastore',
    'aud' => 'https://oauth2.googleapis.com/token',
    'iat' => $now,
    'exp' => $now + 3600
  ]));
  $signature = '';
  openssl_sign("$header.$payload", $signature, $serviceAccount['private_key'], 'SHA256');
  $jwt = "$header.$payload." . base64_encode($signature);
  
  $ch = curl_init('https://oauth2.googleapis.com/token');
  curl_setopt($ch, CURLOPT_POST, true);
  curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
    'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    'assertion' => $jwt
  ]));
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  $res = json_decode(curl_exec($ch), true);
  curl_close($ch);
  return $res['access_token'] ?? null;
}

// Push each alert to Firestore
$token = getFirebaseToken($serviceAccount);
$pushed = 0;

foreach ($alerts as $alert) {
  $firestoreUrl = "https://firestore.googleapis.com/v1/projects/$projectId/databases/(default)/documents/alerts";
  
  $data = [
    'fields' => [
      'title' => ['stringValue' => $alert['title']],
      'message' => ['stringValue' => $alert['message']],
      'type' => ['stringValue' => $alert['type']],
      'timestamp' => ['timestampValue' => date('c')],
      'read' => ['booleanValue' => false]
    ]
  ];

  $ch = curl_init($firestoreUrl);
  curl_setopt($ch, CURLOPT_POST, true);
  curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
  curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $token,
    'Content-Type: application/json'
  ]);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  $result = curl_exec($ch);
  curl_close($ch);
  $pushed++;
}

echo json_encode(['success' => true, 'alerts_pushed' => $pushed, 'message' => "$pushed alerts sent to mobile app"]);
?>