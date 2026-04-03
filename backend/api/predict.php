<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json");
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") { http_response_code(200); exit(0); }

require_once '../config/database.php';
$db = Database::getInstance();

$input = json_decode(file_get_contents('php://input'), true);
$product_id = intval($input['product_id'] ?? 0);

if ($product_id <= 0) { sendJSON(['error' => 'Invalid product_id'], 400); }

// Get actual sales history for this product
$salesHistory = $db->query("
    SELECT DATE_FORMAT(sale_date,'%Y-%m-%d') as date,
           SUM(quantity) as units,
           SUM(total_amount) as revenue,
           SUM(profit) as profit
    FROM sales WHERE product_id = ?
    GROUP BY sale_date ORDER BY sale_date DESC LIMIT 90
", [$product_id], 'i');

$product = $db->query("SELECT * FROM products WHERE id = ? LIMIT 1", [$product_id], 'i');
if (empty($product)) { sendJSON(['error' => 'Product not found'], 404); }
$p = $product[0];

$hasSalesData = count($salesHistory) >= 3;

if ($hasSalesData) {
    // Calculate average daily sales from real data
    $totalUnits = array_sum(array_column($salesHistory, 'units'));
    $totalRevenue = array_sum(array_column($salesHistory, 'revenue'));
    $totalProfit = array_sum(array_column($salesHistory, 'profit'));
    $days = count($salesHistory);
    $avgDaily = $totalUnits / $days;
    $avgDailyRev = $totalRevenue / $days;
    $avgDailyProfit = $totalProfit / $days;
    
    // Day-of-week factor from real data
    $dowSales = [0=>0,1=>0,2=>0,3=>0,4=>0,5=>0,6=>0];
    $dowCount = [0=>0,1=>0,2=>0,3=>0,4=>0,5=>0,6=>0];
    foreach ($salesHistory as $s) {
        $dow = date('w', strtotime($s['date']));
        $dowSales[$dow] += $s['units'];
        $dowCount[$dow]++;
    }
    $dowMult = [];
    for($i=0;$i<7;$i++) {
        $dowMult[$i] = $dowCount[$i] > 0 ? ($dowSales[$i]/$dowCount[$i]) / max(1,$avgDaily) : 1.0;
    }
    
    // Build 13-week forecast
    $weeks = [];
    for ($w = 0; $w < 13; $w++) {
        $weekUnits = 0;
        $startDate = new DateTime();
        $startDate->modify('+'.($w*7).' days');
        for ($d = 0; $d < 7; $d++) {
            $dt = clone $startDate;
            $dt->modify("+{$d} days");
            $dow = intval($dt->format('w'));
            $mult = $dowMult[$dow] ?? 1.0;
            $weekUnits += $avgDaily * $mult;
        }
        $units = max(1, round($weekUnits));
        $revenue = round($units * floatval($p['price']));
        $profit = round($units * (floatval($p['price']) - floatval($p['cost_price'])));
        $label = 'W'.($w+1).' '.$startDate->format('d M');
        $weeks[] = ['week'=>$w+1,'label'=>$label,'units'=>$units,'revenue'=>$revenue,'profit'=>$profit,'confidence'=>max(60, 90-$w*2),'festival'=>in_array($w,[3,7,11])];
    }
    $confidence = 88;
    $source = 'live_data';
} else {
    // Smart fallback - category-based estimation
    $catBase = ['Dairy'=>14,'Bakery'=>13,'Snacks & Biscuits'=>12,'Beverages'=>11,'Rice & Grains'=>10,'Dal & Pulses'=>9,'Atta & Flour'=>8,'Oils & Ghee'=>7,'default'=>8];
    $base = $catBase[$p['category']] ?? $catBase['default'];
    $priceFactor = max(0.5, 1 - (floatval($p['price']) - 50) / 1200);
    $avgDaily = $base * $priceFactor;
    $weeks = [];
    for ($w = 0; $w < 13; $w++) {
        $startDate = new DateTime();
        $startDate->modify('+'.($w*7).' days');
        $units = max(1, round($avgDaily * 7 * (1 + sin($w * 0.7) * 0.1)));
        $revenue = round($units * floatval($p['price']));
        $profit = round($units * (floatval($p['price']) - floatval($p['cost_price'])));
        $label = 'W'.($w+1).' '.$startDate->format('d M');
        $weeks[] = ['week'=>$w+1,'label'=>$label,'units'=>$units,'revenue'=>$revenue,'profit'=>$profit,'confidence'=>max(55, 75-$w*2),'festival'=>false];
    }
    $confidence = 72;
    $source = 'estimated';
}

$totalUnits = array_sum(array_column($weeks,'units'));
$totalRevenue = array_sum(array_column($weeks,'revenue'));
$totalProfit = array_sum(array_column($weeks,'profit'));
$avgWeekly = round($totalUnits / 13);
$urgency = floatval($p['stock']) < $avgWeekly ? 'HIGH' : (floatval($p['stock']) < $avgWeekly*2 ? 'MEDIUM' : 'LOW');

// ── Save predictions to DB (one row per week forecast) ──
try {
    // Delete old predictions for this product (keep DB clean)
    $db->execute(
        "DELETE FROM predictions WHERE product_id = ? AND prediction_date = CURDATE()",
        [$product_id], 'i'
    );

    // Insert each week's forecast as a row
    foreach ($weeks as $w) {
        $factors = json_encode([
            'source'       => $source,
            'confidence'   => $w['confidence'],
            'festival'     => $w['festival'],
            'restock'      => $urgency,
            'has_history'  => $hasSalesData,
            'sales_days'   => count($salesHistory),
        ]);
        $targetDate = (new DateTime())->modify('+' . (($w['week'] - 1) * 7) . ' days')->format('Y-m-d');
        $db->execute(
            "INSERT INTO predictions
                (product_id, predicted_sales, predicted_units, confidence_score, factors, prediction_date, target_date)
             VALUES (?, ?, ?, ?, ?, CURDATE(), ?)",
            [$product_id, $w['revenue'], $w['units'], $w['confidence'], $factors, $targetDate],
            'idiiss'
        );
    }
} catch (Exception $e) {
    // Don't fail the API if DB save fails — just log silently
    error_log('Prediction save error: ' . $e->getMessage());
}

sendJSON([
    'weeks'             => $weeks,
    'total_units'       => $totalUnits,
    'total_revenue'     => $totalRevenue,
    'total_profit'      => $totalProfit,
    'avg_weekly_units'  => $avgWeekly,
    'overall_confidence'=> $confidence,
    'restock_urgency'   => $urgency,
    'source'            => $source,
    'has_sales_data'    => $hasSalesData,
    'sales_days'        => count($salesHistory),
]);