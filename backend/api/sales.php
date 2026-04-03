<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json");
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") { http_response_code(200); exit(0); }

require_once '../config/database.php';
$db = Database::getInstance();

$period = intval($_GET['period'] ?? 30);
$type   = $_GET['type'] ?? 'trend';

if ($type === 'trend') {
    $data = $db->query("
        SELECT DATE_FORMAT(sale_date,'%Y-%m-%d') as date,
               SUM(total_amount) as revenue,
               SUM(quantity) as units,
               SUM(profit) as profit,
               COUNT(DISTINCT bill_no) as bills
        FROM sales
        WHERE sale_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        GROUP BY sale_date ORDER BY sale_date
    ", [$period], 'i');
    sendJSON($data);
}

if ($type === 'calendar') {
    // Return all sales grouped by date for calendar view (current year)
    $data = $db->query("
        SELECT DATE_FORMAT(sale_date,'%Y-%m-%d') as date,
               SUM(total_amount) as revenue,
               SUM(profit) as profit,
               COUNT(DISTINCT bill_no) as bills,
               SUM(quantity) as units
        FROM sales
        WHERE YEAR(sale_date) = YEAR(CURDATE())
        GROUP BY sale_date ORDER BY sale_date
    ");
    sendJSON($data);
}

if ($type === 'by_category') {
    $data = $db->query("
        SELECT p.category,
               SUM(s.total_amount) as revenue,
               SUM(s.quantity) as units,
               SUM(s.profit) as profit
        FROM sales s JOIN products p ON s.product_id = p.id
        WHERE s.sale_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        GROUP BY p.category ORDER BY revenue DESC
    ", [$period], 'i');
    sendJSON($data);
}

if ($type === 'by_payment') {
    $data = $db->query("
        SELECT payment_method, COUNT(*) as count, SUM(total_amount) as revenue
        FROM sales
        WHERE sale_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        GROUP BY payment_method ORDER BY revenue DESC
    ", [$period], 'i');
    sendJSON($data);
}

if ($type === 'summary') {
    $summary = $db->query("
        SELECT 
            SUM(total_amount) as total_revenue,
            SUM(profit) as total_profit,
            SUM(quantity) as total_units,
            COUNT(DISTINCT bill_no) as total_bills,
            COUNT(DISTINCT customer_name) as unique_customers,
            AVG(total_amount) as avg_bill_value
        FROM sales
        WHERE sale_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
    ", [$period], 'i');
    sendJSON($summary[0] ?? []);
}

if ($type === 'rankings') {
    // Product rankings based on actual sales
    $data = $db->query("
        SELECT p.id, p.name, p.category, p.price, p.cost_price, p.stock,
               COALESCE(SUM(s.total_amount),0) as revenue,
               COALESCE(SUM(s.quantity),0) as units_sold,
               COALESCE(SUM(s.profit),0) as profit,
               COALESCE(COUNT(DISTINCT s.sale_date),0) as days_sold,
               MAX(s.sale_date) as last_sold_date
        FROM products p
        LEFT JOIN sales s ON p.id = s.product_id 
            AND s.sale_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        GROUP BY p.id
        ORDER BY revenue DESC
    ", [$period], 'i');
    sendJSON($data);
}

if ($type === 'profit_monthly') {
    // Monthly P&L for current year
    $data = $db->query("
        SELECT DATE_FORMAT(sale_date,'%b') as month,
               MONTH(sale_date) as month_num,
               SUM(total_amount) as revenue,
               SUM(profit) as profit,
               SUM(quantity) as units,
               COUNT(DISTINCT bill_no) as bills
        FROM sales
        WHERE YEAR(sale_date) = YEAR(CURDATE())
        GROUP BY MONTH(sale_date), DATE_FORMAT(sale_date,'%b')
        ORDER BY MONTH(sale_date)
    ");
    sendJSON($data);
}

if ($type === 'today') {
    // Today's stats only
    $data = $db->query("
        SELECT SUM(total_amount) as revenue, SUM(profit) as profit,
               COUNT(DISTINCT bill_no) as bills, SUM(quantity) as units
        FROM sales WHERE sale_date = CURDATE()
    ");
    $yesterday = $db->query("
        SELECT SUM(total_amount) as revenue FROM sales 
        WHERE sale_date = DATE_SUB(CURDATE(),INTERVAL 1 DAY)
    ");
    sendJSON(['today' => $data[0] ?? [], 'yesterday' => $yesterday[0] ?? []]);
}


if ($type === 'date_products') {
    $date = $_GET['date'] ?? date('Y-m-d');

    $products = $db->query("
        SELECT p.name, p.category, p.price,
               SUM(s.quantity)     as qty,
               SUM(s.total_amount) as revenue,
               SUM(s.profit)       as profit
        FROM sales s
        JOIN products p ON s.product_id = p.id
        WHERE s.sale_date = ?
        GROUP BY p.id, p.name, p.category, p.price
        ORDER BY revenue DESC
    ", [$date], 's');

    $bills_raw = $db->query("
        SELECT s.bill_no, s.customer_name, s.payment_method,
               p.name as product_name, p.category,
               s.quantity, s.unit_price, s.discount, s.total_amount
        FROM sales s
        JOIN products p ON s.product_id = p.id
        WHERE s.sale_date = ?
        ORDER BY s.bill_no, p.name
    ", [$date], 's');

    $billMap = [];
    foreach ($bills_raw as $row) {
        $bn = $row['bill_no'];
        if (!isset($billMap[$bn])) {
            $billMap[$bn] = [
                'bill_no'    => $bn,
                'customer'   => $row['customer_name'],
                'payment'    => $row['payment_method'],
                'items'      => [],
                'bill_total' => 0,
            ];
        }
        $billMap[$bn]['items'][]     = $row;
        $billMap[$bn]['bill_total'] += floatval($row['total_amount']);
    }

    sendJSON([
        'date'     => $date,
        'products' => $products,
        'bills'    => array_values($billMap),
    ]);
}

sendJSON([]);