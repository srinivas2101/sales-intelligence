<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json");
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") { http_response_code(200); exit(0); }

require_once '../config/database.php';
$db = Database::getInstance();

$customers = $db->query("
    SELECT c.*,
           COUNT(DISTINCT s.bill_no) as total_bills,
           MAX(s.sale_date) as last_purchase_date,
           SUM(s.total_amount) as calculated_spent
    FROM customers c
    LEFT JOIN sales s ON c.phone = s.customer_phone
    GROUP BY c.id
    ORDER BY c.total_spent DESC
    LIMIT 100
");

$segments = $db->query("
    SELECT segment, COUNT(*) as count, SUM(total_spent) as value, AVG(total_spent) as avg_spent
    FROM customers GROUP BY segment ORDER BY value DESC
");

$topCustomers = $db->query("
    SELECT name, phone, total_spent, visit_count, segment, last_visit
    FROM customers ORDER BY total_spent DESC LIMIT 10
");

sendJSON([
    'customers'    => $customers,
    'segments'     => $segments,
    'topCustomers' => $topCustomers,
    'total'        => count($customers),
]);
?>
