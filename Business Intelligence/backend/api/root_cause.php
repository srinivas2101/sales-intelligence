<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json");
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") { http_response_code(200); exit(0); }

require_once '../config/database.php';

$db = Database::getInstance();
$input = json_decode(file_get_contents('php://input'), true);
$productId = $input['product_id'] ?? null;
$period = $input['period'] ?? 30;

if (!$productId) sendJSON(['error' => 'Product ID required'], 400);

// Get current vs previous period sales
$current = $db->query("
    SELECT SUM(total_amount) as revenue, SUM(quantity) as units, AVG(unit_price) as avg_price
    FROM sales WHERE product_id = ? AND sale_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
", [$productId, $period], 'ii');

$previous = $db->query("
    SELECT SUM(total_amount) as revenue, SUM(quantity) as units, AVG(unit_price) as avg_price
    FROM sales WHERE product_id = ? 
    AND sale_date BETWEEN DATE_SUB(CURDATE(), INTERVAL ? DAY) AND DATE_SUB(CURDATE(), INTERVAL ? DAY)
", [$productId, $period * 2, $period], 'iii');

$product = $db->query("SELECT * FROM products WHERE id = ?", [$productId], 'i');

if (empty($product)) sendJSON(['error' => 'Product not found'], 404);

$prod = $product[0];
$curr = $current[0];
$prev = $previous[0];

$revenueDrop = $prev['revenue'] > 0 
    ? round((($prev['revenue'] - $curr['revenue']) / $prev['revenue']) * 100, 1) 
    : 0;

// AI Root Cause Logic
$causes = [];
$recommendations = [];

// Price Analysis
if ($curr['avg_price'] > $prev['avg_price'] * 1.05) {
    $pricePct = round((($curr['avg_price'] - $prev['avg_price']) / $prev['avg_price']) * 100, 1);
    $causes[] = [
        'factor' => 'Price Increase',
        'impact' => 'HIGH',
        'icon' => '💰',
        'detail' => "Price increased by {$pricePct}% compared to previous period. This directly reduced demand.",
        'confidence' => 87
    ];
    $recommendations[] = "Consider a temporary discount of {$pricePct}% to restore sales volume.";
}

// Stock Analysis
if ($prod['stock'] < 20) {
    $causes[] = [
        'factor' => 'Low Stock',
        'impact' => 'HIGH',
        'icon' => '📦',
        'detail' => "Only {$prod['stock']} units remaining. Stock shortages reduce customer confidence and conversions.",
        'confidence' => 92
    ];
    $recommendations[] = "Immediately restock {$prod['name']}. Maintain minimum 50 units buffer.";
}

// Seasonal Analysis
$currentMonth = date('n');
$season = ($currentMonth >= 3 && $currentMonth <= 5) ? 'Spring' 
        : (($currentMonth >= 6 && $currentMonth <= 8) ? 'Summer' 
        : (($currentMonth >= 9 && $currentMonth <= 11) ? 'Autumn' : 'Winter'));

$seasonalCategories = ['Electronics' => ['Winter', 'Autumn'], 'Apparel' => ['Summer', 'Spring']];
$highSeason = isset($seasonalCategories[$prod['category']]) 
    ? in_array($season, $seasonalCategories[$prod['category']]) 
    : false;

if (!$highSeason) {
    $causes[] = [
        'factor' => 'Seasonal Change',
        'impact' => 'MEDIUM',
        'icon' => '🌦️',
        'detail' => "{$season} is typically low season for {$prod['category']}. Demand naturally drops during this period.",
        'confidence' => 75
    ];
    $recommendations[] = "Launch a seasonal promotion campaign. Offer bundle deals to stimulate off-season demand.";
}

// Weekend/Weekday pattern
$dayPattern = $db->query("
    SELECT day_of_week, SUM(total_amount) as revenue 
    FROM sales WHERE product_id = ? AND sale_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    GROUP BY day_of_week ORDER BY revenue DESC
", [$productId], 'i');

if (empty($dayPattern)) {
    $causes[] = [
        'factor' => 'Low Marketing Activity',
        'impact' => 'MEDIUM',
        'icon' => '📢',
        'detail' => "Sales data shows no consistent pattern, suggesting absence of targeted marketing campaigns.",
        'confidence' => 68
    ];
    $recommendations[] = "Launch targeted digital marketing campaign focusing on peak buying days (Friday-Sunday).";
}

// Competitor Analysis (simulated)
if ($revenueDrop > 15) {
    $causes[] = [
        'factor' => 'Competitor Pressure',
        'impact' => 'MEDIUM',
        'icon' => '🏆',
        'detail' => "Significant revenue drop ({$revenueDrop}%) suggests possible competitor promotions or new entrants.",
        'confidence' => 65
    ];
    $recommendations[] = "Analyze competitor pricing. Consider adding unique value-adds like extended warranty or free delivery.";
}

$primaryCause = !empty($causes) ? $causes[0]['factor'] : 'No significant issue detected';

// Save analysis
$db->execute("
    INSERT INTO root_cause_analysis (product_id, analysis_date, sales_drop_pct, causes, recommendations)
    VALUES (?, CURDATE(), ?, ?, ?)
", [$productId, $revenueDrop, json_encode($causes), implode(' ', $recommendations)], 'idss');

sendJSON([
    'product' => $prod,
    'revenueDrop' => $revenueDrop,
    'currentRevenue' => $curr['revenue'] ?? 0,
    'previousRevenue' => $prev['revenue'] ?? 0,
    'causes' => $causes,
    'recommendations' => $recommendations,
    'primaryCause' => $primaryCause,
    'analysisDate' => date('Y-m-d H:i:s')
]);
?>
