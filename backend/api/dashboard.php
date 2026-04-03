<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json");
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") { http_response_code(200); exit(0); }

require_once '../config/database.php';
$db = Database::getInstance();

// Today's Revenue
$todayRev = $db->query("SELECT SUM(total_amount) as total, SUM(profit) as profit, COUNT(DISTINCT bill_no) as bills FROM sales WHERE sale_date = CURDATE()");
$yesterdayRev = $db->query("SELECT SUM(total_amount) as total FROM sales WHERE sale_date = DATE_SUB(CURDATE(),INTERVAL 1 DAY)");
$weekRev = $db->query("SELECT SUM(total_amount) as total FROM sales WHERE sale_date >= DATE_SUB(CURDATE(),INTERVAL 7 DAY)");
$monthRev = $db->query("SELECT SUM(total_amount) as total, SUM(profit) as profit FROM sales WHERE sale_date >= DATE_SUB(CURDATE(),INTERVAL 30 DAY)");

$currentRev = floatval($todayRev[0]['total'] ?? 0);
$prevRev    = floatval($yesterdayRev[0]['total'] ?? 1);
$revenueGrowth = $prevRev > 0 ? round((($currentRev - $prevRev) / $prevRev) * 100, 1) : 0;

// Top Products (last 30 days)
$topProducts = $db->query("
    SELECT p.name, p.category, SUM(s.total_amount) as revenue, SUM(s.quantity) as units
    FROM sales s JOIN products p ON s.product_id = p.id
    WHERE s.sale_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    GROUP BY p.id ORDER BY revenue DESC LIMIT 8
");

// Sales Trend (last 30 days)
$salesTrend = $db->query("
    SELECT DATE_FORMAT(sale_date, '%Y-%m-%d') as date, 
           SUM(total_amount) as revenue,
           SUM(quantity) as units,
           SUM(profit) as profit,
           COUNT(DISTINCT bill_no) as bills
    FROM sales 
    WHERE sale_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    GROUP BY sale_date ORDER BY sale_date
");

// Category Revenue
$catRevenue = $db->query("
    SELECT p.category, SUM(s.total_amount) as revenue, SUM(s.quantity) as units
    FROM sales s JOIN products p ON s.product_id = p.id
    WHERE s.sale_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    GROUP BY p.category ORDER BY revenue DESC
");

// Customer Segments
$segments = $db->query("
    SELECT segment, COUNT(*) as count, SUM(total_spent) as total_value
    FROM customers GROUP BY segment
");

// Expiry Alerts (products expiring soon from expiry_tracking)
$expiryAlerts = $db->query("
    SELECT p.name, et.expiry_date, et.batch_qty, et.units_sold,
           DATEDIFF(et.expiry_date, CURDATE()) as days_left
    FROM expiry_tracking et JOIN products p ON et.product_id = p.id
    WHERE et.expiry_date > CURDATE() AND DATEDIFF(et.expiry_date, CURDATE()) <= 7
    ORDER BY days_left ASC LIMIT 5
");

// Low stock alerts
$lowStock = $db->query("SELECT name, stock, reorder_point FROM products WHERE stock < reorder_point AND stock > 0 ORDER BY stock ASC LIMIT 5");
$outOfStock = $db->query("SELECT name FROM products WHERE stock = 0 LIMIT 5");

$alerts = [];
foreach ($expiryAlerts as $item) {
    $alerts[] = ['type' => 'expiry', 'message' => "Expiry Alert: {$item['name']} — expires in {$item['days_left']} day(s). Sell or discount now."];
}
foreach ($outOfStock as $item) {
    $alerts[] = ['type' => 'critical', 'message' => "Out of Stock: {$item['name']} — 0 units remaining!"];
}
foreach ($lowStock as $item) {
    $alerts[] = ['type' => 'warning', 'message' => "Low stock: {$item['name']} ({$item['stock']} units left)"];
}

// Has any sales data been uploaded?
$hasData = $db->query("SELECT COUNT(*) as cnt FROM sales");
$salesCount = intval($hasData[0]['cnt'] ?? 0);

sendJSON([
    'revenue'          => ['today' => $currentRev, 'growth' => $revenueGrowth, 'week' => floatval($weekRev[0]['total']??0), 'month' => floatval($monthRev[0]['total']??0), 'month_profit' => floatval($monthRev[0]['profit']??0)],
    'bills_today'      => intval($todayRev[0]['bills'] ?? 0),
    'profit_today'     => floatval($todayRev[0]['profit'] ?? 0),
    'topProducts'      => $topProducts,
    'salesTrend'       => $salesTrend,
    'catRevenue'       => $catRevenue,
    'customerSegments' => $segments,
    'alerts'           => array_slice($alerts, 0, 5),
    'has_sales_data'   => $salesCount > 0,
    'upload_count'     => $salesCount,
]);
