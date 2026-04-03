<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") { http_response_code(200); exit(0); }
require_once '../config/database.php';
$db = Database::getInstance();

$GST_RATES = [
  'Rice & Grains'=>0,'Dal & Pulses'=>0,'Atta & Flour'=>0,'Vegetables'=>0,'Fruits'=>0,
  'Dairy'=>5,'Oils & Ghee'=>5,'Spices & Masala'=>5,'Bakery'=>5,'Baby & Health'=>5,
  'Beverages'=>12,'Snacks & Biscuits'=>12,'Frozen & Packed'=>12,'Stationery'=>12,
  'Personal Care'=>18,'Home Care'=>18,'Condiments'=>12,'Sweets'=>5,
];

// Monthly GST from actual sales (current year)
$monthly = $db->query("
  SELECT DATE_FORMAT(s.sale_date,'%b %y') as month,
         MONTH(s.sale_date) as month_num,
         YEAR(s.sale_date) as yr,
         p.category,
         SUM(s.total_amount) as sales,
         SUM(s.total_amount - s.profit) as purchases
  FROM sales s JOIN products p ON s.product_id=p.id
  WHERE YEAR(s.sale_date)=YEAR(CURDATE())
  GROUP BY YEAR(s.sale_date), MONTH(s.sale_date), p.category
  ORDER BY yr, month_num
");

// Aggregate by month
$months = [];
foreach ($monthly as $row) {
  $key = $row['month'];
  if (!isset($months[$key])) $months[$key] = ['month'=>$key,'sales'=>0,'purchases'=>0,'outputGST'=>0,'inputGST'=>0];
  $rate = ($GST_RATES[$row['category']] ?? 12) / 100;
  $months[$key]['sales']     += floatval($row['sales']);
  $months[$key]['purchases'] += floatval($row['purchases']);
  $months[$key]['outputGST'] += floatval($row['sales']) * $rate;
  $months[$key]['inputGST']  += floatval($row['purchases']) * $rate;
}
foreach ($months as &$m) { $m['netGST'] = $m['outputGST'] - $m['inputGST']; $m['filed'] = false; }

// Today's GST
$todayGST = $db->query("
  SELECT p.category, SUM(s.total_amount) as sales
  FROM sales s JOIN products p ON s.product_id=p.id
  WHERE s.sale_date=CURDATE() GROUP BY p.category
");
$todayOutput = 0; $todayInput = 0;
foreach ($todayGST as $r) {
  $rate = ($GST_RATES[$r['category']] ?? 12) / 100;
  $todayOutput += floatval($r['sales']) * $rate;
  $todayInput  += floatval($r['sales']) * 0.7 * $rate;
}

// Category breakdown from today
$catBreakdown = $db->query("
  SELECT p.category, SUM(s.total_amount) as taxable_value, SUM(s.quantity) as units
  FROM sales s JOIN products p ON s.product_id=p.id
  WHERE s.sale_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
  GROUP BY p.category ORDER BY taxable_value DESC
");

sendJSON([
  'monthly'=>array_values($months),
  'today'=>['output'=>round($todayOutput,2),'input'=>round($todayInput,2),'net'=>round($todayOutput-$todayInput,2)],
  'catBreakdown'=>$catBreakdown,
  'gstRates'=>$GST_RATES,
]);
