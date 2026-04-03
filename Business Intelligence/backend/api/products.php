<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json");
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") { http_response_code(200); exit(0); }

require_once '../config/database.php';

$db     = Database::getInstance();
$method = $_SERVER['REQUEST_METHOD'];

// Auto-create price_history table if it doesn't exist
$db->execute("CREATE TABLE IF NOT EXISTS price_history (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    product_id  INT NOT NULL,
    old_price   DECIMAL(10,2) NOT NULL,
    new_price   DECIMAL(10,2) NOT NULL,
    old_cost    DECIMAL(10,2),
    new_cost    DECIMAL(10,2),
    changed_by  VARCHAR(100) DEFAULT 'Store Owner',
    note        VARCHAR(255) DEFAULT '',
    changed_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
)", [], '');

switch ($method) {
    case 'GET':
        $products = $db->query("
            SELECT p.*,
                   COALESCE(SUM(s.total_amount),0) AS total_revenue,
                   COALESCE(SUM(s.quantity),0)     AS total_units_sold
            FROM products p
            LEFT JOIN sales s ON p.id = s.product_id
            GROUP BY p.id
            ORDER BY p.category, p.name
        ");
        sendJSON($products);
        break;

    case 'POST':
        $input = json_decode(file_get_contents('php://input'), true);
        $db->execute(
            "INSERT INTO products (name,category,sub_category,price,cost_price,stock,unit,expiry_days,reorder_point) VALUES (?,?,?,?,?,?,?,?,?)",
            [$input['name'],$input['category'],$input['sub_category']??'',$input['price'],$input['cost_price'],$input['stock'],$input['unit']??'pack',$input['expiry_days']??365,$input['reorder_point']??20],
            'sssddisii'
        );
        sendJSON(['success'=>true,'message'=>'Product added']);
        break;

    case 'PUT':
        $input    = json_decode(file_get_contents('php://input'), true);
        if (empty($input['id'])) { sendJSON(['success'=>false,'message'=>'Missing product id'], 400); }

        // Fetch current price BEFORE update
        $current  = $db->query("SELECT price, cost_price FROM products WHERE id=?", [(int)$input['id']], 'i');
        $oldPrice = isset($current[0]) ? (float)$current[0]['price']      : null;
        $oldCost  = isset($current[0]) ? (float)$current[0]['cost_price'] : null;
        $newPrice = (float)$input['price'];
        $newCost  = (float)$input['cost_price'];

        // Update product
        $db->execute(
            "UPDATE products SET name=?,category=?,price=?,cost_price=?,stock=?,unit=?,expiry_days=?,reorder_point=? WHERE id=?",
            [$input['name'],$input['category'],$newPrice,$newCost,(int)$input['stock'],$input['unit']??'pack',(int)($input['expiry_days']??365),(int)($input['reorder_point']??20),(int)$input['id']],
            'ssddiisii'
        );

        // Log to price_history if price or cost changed
        if ($oldPrice !== null && ($oldPrice !== $newPrice || $oldCost !== $newCost)) {
            $db->execute(
                "INSERT INTO price_history (product_id, old_price, new_price, old_cost, new_cost, changed_by, note) VALUES (?,?,?,?,?,?,?)",
                [(int)$input['id'], $oldPrice, $newPrice, $oldCost, $newCost, $input['changed_by']??'Store Owner', $input['note']??''],
                'iddddss'
            );
        }

        sendJSON(['success'=>true,'message'=>'Product updated']);
        break;

    case 'DELETE':
        $id = intval($_GET['id'] ?? 0);
        if ($id) {
            $db->execute("DELETE FROM products WHERE id=?", [$id], 'i');
            sendJSON(['success'=>true]);
        }
        break;
}
?>