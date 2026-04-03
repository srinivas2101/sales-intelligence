<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") { http_response_code(200); exit(0); }
require_once '../config/database.php';
$db = Database::getInstance();

$notifications = [];

// Today's upload summary
$uploads = $db->query("SELECT * FROM upload_log WHERE DATE(uploaded_at)=CURDATE() ORDER BY uploaded_at DESC");
foreach ($uploads as $u) {
  $notifications[] = ['type'=>'upload','icon'=>'📤','title'=>'Bills Uploaded','msg'=>"Processed {$u['items_processed']} items across {$u['bills_count']} bills — ₹".number_format($u['total_revenue'],0),'time'=>$u['uploaded_at'],'color'=>'#2d7a3a','bg'=>'#e8f5e9'];
}

// Expiry alerts
$expiry = $db->query("SELECT name, expiry_days FROM products WHERE stock>0 AND expiry_days<=7 AND expiry_days IS NOT NULL ORDER BY expiry_days ASC LIMIT 5");
foreach ($expiry as $p) {
  $notifications[] = ['type'=>'expiry','icon'=>'⏰','title'=>'Expiry Alert','msg'=>"{$p['name']} expires in {$p['expiry_days']} day(s).",'time'=>date('Y-m-d H:i:s'),'color'=>'#ea580c','bg'=>'#ffedd5'];
}

// Low stock alerts
$lowStock = $db->query("SELECT name, stock, reorder_point FROM products WHERE stock < reorder_point AND stock > 0 ORDER BY (stock/reorder_point) ASC LIMIT 5");
foreach ($lowStock as $p) {
  $notifications[] = ['type'=>'stock','icon'=>'📦','title'=>'Low Stock','msg'=>"{$p['name']} — only {$p['stock']} units left (reorder at {$p['reorder_point']})",'time'=>date('Y-m-d H:i:s'),'color'=>'#d97706','bg'=>'#fef3c7'];
}

// Out of stock
$oos = $db->query("SELECT name FROM products WHERE stock=0 LIMIT 3");
foreach ($oos as $p) {
  $notifications[] = ['type'=>'critical','icon'=>'🚨','title'=>'Out of Stock','msg'=>"{$p['name']} — 0 units remaining!",'time'=>date('Y-m-d H:i:s'),'color'=>'#dc2626','bg'=>'#fee2e2'];
}

// Today revenue milestone
$todayRev = $db->query("SELECT SUM(total_amount) as t FROM sales WHERE sale_date=CURDATE()");
$rev = floatval($todayRev[0]['t']??0);
if ($rev > 0) {
  $notifications[] = ['type'=>'revenue','icon'=>'💰','title'=>"Today's Revenue",'msg'=>"₹".number_format($rev,0)." earned today so far",'time'=>date('Y-m-d H:i:s'),'color'=>'#1d4ed8','bg'=>'#dbeafe'];
}

sendJSON(['notifications'=>$notifications,'count'=>count($notifications)]);
