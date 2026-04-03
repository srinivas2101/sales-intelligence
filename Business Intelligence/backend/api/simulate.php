<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json");
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") { http_response_code(200); exit(0); }

require_once '../config/database.php';

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) sendJSON(['error' => 'Invalid input'], 400);

$db = Database::getInstance();

$scenario    = $input['scenario'] ?? 'price_change';
$productId   = intval($input['product_id'] ?? 0);
$changeVal   = floatval($input['change_value'] ?? 10);
$period      = intval($input['period'] ?? 30);

// Get product
$products = $productId > 0
    ? $db->query("SELECT * FROM products WHERE id=? LIMIT 1", [$productId], 'i')
    : $db->query("SELECT * FROM products ORDER BY risk_score DESC LIMIT 10");

if (empty($products)) sendJSON(['error' => 'No products found'], 404);

$results = [];
foreach ($products as $p) {
    $baseUnits   = 8 * $period;
    $baseRevenue = $baseUnits * floatval($p['price']);
    $baseProfit  = $baseUnits * (floatval($p['price']) - floatval($p['cost_price']));

    switch ($scenario) {
        case 'price_change':
            $newPrice    = floatval($p['price']) * (1 + $changeVal / 100);
            $elasticity  = -1.2;
            $demandChange = $elasticity * ($changeVal / 100);
            $newUnits    = max(0, round($baseUnits * (1 + $demandChange)));
            $newRevenue  = $newUnits * $newPrice;
            $newProfit   = $newUnits * ($newPrice - floatval($p['cost_price']));
            $label       = ($changeVal >= 0 ? '+' : '') . $changeVal . '% Price';
            break;
        case 'stock_boost':
            $newUnits    = round($baseUnits * 1.15);
            $newRevenue  = $newUnits * floatval($p['price']);
            $newProfit   = $newUnits * (floatval($p['price']) - floatval($p['cost_price']));
            $label       = "+{$changeVal}% Stock";
            break;
        case 'discount':
            $newPrice    = floatval($p['price']) * (1 - $changeVal / 100);
            $newUnits    = round($baseUnits * (1 + ($changeVal / 100) * 1.5));
            $newRevenue  = $newUnits * $newPrice;
            $newProfit   = $newUnits * ($newPrice - floatval($p['cost_price']));
            $label       = "{$changeVal}% Discount";
            break;
        default:
            $newUnits = $baseUnits; $newRevenue = $baseRevenue; $newProfit = $baseProfit;
            $label = 'No Change';
    }

    $results[] = [
        'name'         => $p['name'],
        'category'     => $p['category'],
        'base_units'   => $baseUnits,
        'base_revenue' => round($baseRevenue),
        'base_profit'  => round($baseProfit),
        'new_units'    => $newUnits,
        'new_revenue'  => round($newRevenue),
        'new_profit'   => round($newProfit),
        'revenue_diff' => round($newRevenue - $baseRevenue),
        'profit_diff'  => round($newProfit - $baseProfit),
        'label'        => $label,
    ];
}

$totalRevDiff  = array_sum(array_column($results, 'revenue_diff'));
$totalProfDiff = array_sum(array_column($results, 'profit_diff'));

sendJSON([
    'results'       => $results,
    'scenario'      => $scenario,
    'total_revenue_impact' => $totalRevDiff,
    'total_profit_impact'  => $totalProfDiff,
    'recommendation' => $totalProfDiff > 0 ? "✅ This scenario improves profit by ₹".number_format($totalProfDiff)."." : "⚠️ This scenario reduces profit by ₹".number_format(abs($totalProfDiff)).". Reconsider.",
]);
?>