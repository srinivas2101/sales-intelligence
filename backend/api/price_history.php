<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json");
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") { http_response_code(200); exit(0); }

require_once '../config/database.php';

$db     = Database::getInstance();
$method = $_SERVER['REQUEST_METHOD'];

// Auto-create table if not exists
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

if ($method === 'GET') {
    $productId = intval($_GET['product_id'] ?? 0);

    if ($productId > 0) {
        // History for a single product
        $rows = $db->query("
            SELECT
                ph.id,
                ph.old_price,
                ph.new_price,
                ph.old_cost,
                ph.new_cost,
                ph.changed_by,
                ph.note,
                ph.changed_at,
                p.name  AS product_name,
                p.unit  AS product_unit
            FROM price_history ph
            JOIN products p ON p.id = ph.product_id
            WHERE ph.product_id = ?
            ORDER BY ph.changed_at DESC
            LIMIT 60
        ", [$productId], 'i');
        sendJSON($rows);

    } else {
        // Summary — latest change per product (for the list view)
        $rows = $db->query("
            SELECT
                ph.product_id,
                p.name        AS product_name,
                p.category,
                p.price       AS current_price,
                p.cost_price  AS current_cost,
                ph.old_price,
                ph.new_price,
                ph.changed_at,
                COUNT(ph2.id) AS change_count
            FROM price_history ph
            JOIN products p ON p.id = ph.product_id
            LEFT JOIN price_history ph2 ON ph2.product_id = ph.product_id
            WHERE ph.changed_at = (
                SELECT MAX(ph3.changed_at)
                FROM price_history ph3
                WHERE ph3.product_id = ph.product_id
            )
            GROUP BY ph.product_id, p.name, p.category, p.price, p.cost_price, ph.old_price, ph.new_price, ph.changed_at
            ORDER BY ph.changed_at DESC
            LIMIT 100
        ");
        sendJSON($rows);
    }
}
?>