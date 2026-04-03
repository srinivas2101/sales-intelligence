<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") { http_response_code(200); exit(0); }
require_once '../config/database.php';
$db = Database::getInstance();

// Products with expiry info — based on actual stock and expiry_days
$products = $db->query("
  SELECT id, name, category, stock, price, cost_price, expiry_days, reorder_point
  FROM products
  WHERE stock > 0 AND expiry_days IS NOT NULL AND expiry_days <= 30
  ORDER BY expiry_days ASC
");

$critical=0; $thisWeek=0; $twoWeeks=0; $thisMonth=0; $potentialLoss=0;
foreach ($products as $p) {
  $d = intval($p['expiry_days']);
  if ($d <= 2)       { $critical++; $potentialLoss += floatval($p['stock'])*floatval($p['cost_price']); }
  elseif ($d <= 5)   $thisWeek++;
  elseif ($d <= 14)  $twoWeeks++;
  else               $thisMonth++;
}

// Also get expiry_tracking table entries
$tracked = $db->query("
  SELECT et.*, p.name, p.category, p.price, p.cost_price,
         DATEDIFF(et.expiry_date, CURDATE()) as days_left
  FROM expiry_tracking et JOIN products p ON et.product_id=p.id
  WHERE et.expiry_date >= CURDATE()
  ORDER BY et.expiry_date ASC LIMIT 50
");

sendJSON([
  'products'=>$products,
  'tracked'=>$tracked,
  'summary'=>['critical'=>$critical,'this_week'=>$thisWeek,'two_weeks'=>$twoWeeks,'this_month'=>$thisMonth,'potential_loss'=>round($potentialLoss,2)],
]);
