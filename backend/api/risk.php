<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json");
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") { http_response_code(200); exit(0); }

require_once '../config/database.php';
$db = Database::getInstance();

$products = $db->query("SELECT * FROM products");
$riskItems = [];

foreach ($products as $p) {
    $score = 0;
    $reasons = [];

    // Stock risk
    if ($p['stock'] <= 0) {
        $score += 50; $reasons[] = "Out of stock";
    } elseif ($p['stock'] < $p['reorder_point'] * 0.4) {
        $score += 35; $reasons[] = "Critical low stock ({$p['stock']} units)";
    } elseif ($p['stock'] < $p['reorder_point']) {
        $score += 20; $reasons[] = "Below reorder point";
    }

    // Expiry risk
    if ($p['expiry_days'] <= 2) {
        $score += 40; $reasons[] = "Expires in {$p['expiry_days']} day(s)";
    } elseif ($p['expiry_days'] <= 7) {
        $score += 25; $reasons[] = "Expiring this week";
    } elseif ($p['expiry_days'] <= 14) {
        $score += 10; $reasons[] = "Expiring soon";
    }

    // Margin risk
    $margin = $p['price'] > 0 ? (($p['price'] - $p['cost_price']) / $p['price']) * 100 : 0;
    if ($margin < 5) { $score += 15; $reasons[] = "Very low margin (".round($margin)."%)"; }

    $score = min($score, 100);

    // Update risk_score in DB
    $db->execute("UPDATE products SET risk_score=? WHERE id=?", [$score, $p['id']], 'ii');

    if ($score >= 30) {
        $level = $score >= 70 ? 'critical' : $score >= 50 ? 'high' : 'medium';
        $riskItems[] = [
            'id'         => $p['id'],
            'name'       => $p['name'],
            'category'   => $p['category'],
            'stock'      => $p['stock'],
            'price'      => $p['price'],
            'expiry_days'=> $p['expiry_days'],
            'risk_score' => $score,
            'level'      => $level,
            'reasons'    => $reasons,
        ];
    }
}

usort($riskItems, fn($a,$b) => $b['risk_score'] - $a['risk_score']);

$critical = array_filter($riskItems, fn($i) => $i['level']==='critical');
$high     = array_filter($riskItems, fn($i) => $i['level']==='high');

sendJSON([
    'items'          => array_values($riskItems),
    'critical_count' => count($critical),
    'high_count'     => count($high),
    'total'          => count($riskItems),
]);
?>