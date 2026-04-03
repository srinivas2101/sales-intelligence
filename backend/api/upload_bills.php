<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json");
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") { http_response_code(200); exit(0); }

require_once '../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { sendJSON(['error' => 'POST only'], 405); }

if (!isset($_FILES['bills_file']) || $_FILES['bills_file']['error'] !== UPLOAD_ERR_OK) {
    $errMsg = isset($_FILES['bills_file']) ? 'Upload error: '.$_FILES['bills_file']['error'] : 'No file uploaded';
    sendJSON(['error' => $errMsg], 400);
}

$file     = $_FILES['bills_file'];
$ext      = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
$saleDate = $_POST['sale_date'] ?? date('Y-m-d');

if (!in_array($ext, ['xlsx','xls','csv'])) {
    sendJSON(['error' => 'Only .xlsx .xls .csv accepted'], 400);
}

$tmpPath = sys_get_temp_dir().'/bi_bills_'.uniqid().'.'.$ext;
if (!move_uploaded_file($file['tmp_name'], $tmpPath)) {
    sendJSON(['error' => 'Could not save uploaded file'], 500);
}

$bills = ($ext === 'csv') ? parseCSV($tmpPath) : parseXLSX($tmpPath);
@unlink($tmpPath);

if (empty($bills)) {
    sendJSON(['error' => 'No data rows found. Make sure file has data from row 4 onwards.'], 400);
}

$db   = Database::getInstance();
$conn = $db->getConnection();

$processed   = 0;
$skipped     = 0;
$duplicates  = 0;
$billCount   = 0;
$totalRev    = 0;
$stockIssues = [];

$conn->begin_transaction();

try {
    foreach ($bills as $bill) {
        $billNo   = trim($bill['bill_no'] ?? '');
        $custName = trim($bill['customer_name'] ?? 'Walk-in');
        $phone    = trim($bill['phone'] ?? '');
        $payment  = trim($bill['payment'] ?? 'Cash');
        $items    = $bill['items'] ?? [];

        if (empty($billNo) || empty($items)) { $skipped++; continue; }

        // ── Auto-prefix bill_no with date if not already prefixed ──
        // Ensures B001 on 24-Mar and B001 on 25-Mar are treated as different bills
        $datePrefix = date('Ymd', strtotime($saleDate));
        if (!preg_match('/^\d{8}-/', $billNo)) {
            $billNo = $datePrefix . '-' . $billNo;
        }

        // ── Duplicate check — bill_no + sale_date both must be unique ──
        $dupCheck = $conn->prepare("SELECT id FROM sales WHERE bill_no = ? AND sale_date = ? LIMIT 1");
        $dupCheck->bind_param('ss', $billNo, $saleDate);
        $dupCheck->execute();
        $dupCheck->store_result();
        $isDuplicate = $dupCheck->num_rows > 0;
        $dupCheck->close();
        if ($isDuplicate) { $skipped++; $duplicates++; continue; }

        $billTotal = 0;
        $billItems = 0;

        foreach ($items as $item) {
            $prodName = trim($item['product'] ?? '');
            $qty      = intval($item['qty'] ?? 0);
            $discount = floatval($item['discount'] ?? 0);

            if (empty($prodName) || $qty <= 0) continue;

            // 1. Exact match
            $productRows = $db->query(
                "SELECT id, name, price, cost_price, stock FROM products WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1",
                [$prodName], 's'
            );

            // 2. LIKE match
            if (empty($productRows)) {
                $productRows = $db->query(
                    "SELECT id, name, price, cost_price, stock FROM products WHERE name LIKE ? LIMIT 1",
                    ['%'.$prodName.'%'], 's'
                );
            }

            // 3. Smart match — strip size suffix (e.g. "5kg"→"1kg", "10kg"→"1kg")
            if (empty($productRows)) {
                $baseName = preg_replace('/\s+\d+(kg|g|L|ml|pc|pcs|pack)\b/i', '', $prodName);
                $baseName = trim($baseName);
                if ($baseName !== $prodName) {
                    $productRows = $db->query(
                        "SELECT id, name, price, cost_price, stock FROM products WHERE name LIKE ? LIMIT 1",
                        ['%'.$baseName.'%'], 's'
                    );
                }
            }

            if (empty($productRows)) {
                $stockIssues[] = "Product not found: $prodName";
                $skipped++;
                continue;
            }

            $product   = $productRows[0];
            $prodId    = intval($product['id']);
            $unitPrice = floatval($product['price']);
            $costPrice = floatval($product['cost_price']);
            $currStock = intval($product['stock']);

            if ($currStock < $qty) {
                $stockIssues[] = "Low stock: {$product['name']} (need $qty, have $currStock)";
                $qty = min($qty, max(0, $currStock));
                if ($qty <= 0) { $skipped++; continue; }
            }

            $itemTotal  = ($unitPrice * $qty) - $discount;
            $itemProfit = (($unitPrice - $costPrice) * $qty) - $discount;

            // Insert sale
            $saleInsert = $db->execute(
                "INSERT INTO sales (product_id, quantity, unit_price, discount, total_amount, profit, sale_date, payment_method, bill_no, customer_name, customer_phone)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                [$prodId,$qty,$unitPrice,$discount,$itemTotal,$itemProfit,$saleDate,$payment,$billNo,$custName,$phone],
                'iiddddsssss'
            );

            // Update stock
            $stockUpdate = $db->execute(
                "UPDATE products SET stock = GREATEST(0, stock - ?) WHERE id = ?",
                [$qty, $prodId], 'ii'
            );

            if ($saleInsert && $stockUpdate) {
                $billTotal += $itemTotal;
                $billItems++;
                $processed++;
            } else {
                $stockIssues[] = "DB error for: {$product['name']}";
                $skipped++;
            }
        }

        if ($billItems > 0) {
            $billCount++;
            $totalRev += $billTotal;

            if (!empty($custName) && strtolower($custName) !== 'walk-in' && !empty($phone)) {
                $existing = $db->query(
                    "SELECT id, total_spent, visit_count FROM customers WHERE phone = ? LIMIT 1",
                    [$phone], 's'
                );
                if (!empty($existing)) {
                    $newSpent  = floatval($existing[0]['total_spent']) + $billTotal;
                    $newVisits = intval($existing[0]['visit_count']) + 1;
                    $segment   = getSegment($newSpent, $newVisits);
                    $db->execute(
                        "UPDATE customers SET total_spent=?,visit_count=?,last_visit=?,segment=? WHERE id=?",
                        [$newSpent,$newVisits,$saleDate,$segment,intval($existing[0]['id'])], 'diiss'
                    );
                } else {
                    $segment = getSegment($billTotal, 1);
                    $db->execute(
                        "INSERT INTO customers (name,phone,total_spent,visit_count,first_visit,last_visit,segment) VALUES (?,?,?,1,?,?,?)",
                        [$custName,$phone,$billTotal,$saleDate,$saleDate,$segment], 'ssdiss'
                    );
                }
            }
        }
    }

    $conn->commit();

    // Log the upload
    $db->execute(
        "INSERT INTO upload_log (filename, sale_date, bills_count, items_processed, total_revenue) VALUES (?,?,?,?,?)",
        [$file['name'], $saleDate, $billCount, $processed, $totalRev],
        'ssiid'
    );

    $dupMsg = $duplicates > 0 ? " $duplicates duplicate bills skipped (already uploaded)." : '';
    sendJSON([
        'success'       => true,
        'processed'     => $processed,
        'skipped'       => $skipped,
        'duplicates'    => $duplicates,
        'bills'         => $billCount,
        'total_revenue' => round($totalRev, 2),
        'stock_issues'  => array_slice($stockIssues, 0, 10),
        'message'       => "$processed items processed across $billCount bills. Stock updated successfully.$dupMsg"
    ]);

} catch (Exception $e) {
    $conn->rollback();
    sendJSON(['error' => 'Processing failed: '.$e->getMessage()], 500);
}

function getSegment($s,$v) {
    if ($s>5000||$v>20) return 'Premium';
    if ($s>2000||$v>8)  return 'Regular';
    if ($s>500 ||$v>3)  return 'Occasional';
    return 'New';
}

function parseCSV($path) {
    $bills = [];
    if (($fh = fopen($path,'r'))===false) return $bills;
    fgetcsv($fh); // skip header
    while (($row=fgetcsv($fh))!==false) {
        if (empty($row[0])) continue;
        $billNo = trim($row[0]);
        if (!isset($bills[$billNo])) {
            $bills[$billNo] = [
                'bill_no'       => $billNo,
                'customer_name' => trim($row[1]??'Walk-in'),
                'phone'         => trim($row[2]??''),
                'payment'       => trim($row[7]??'Cash'),
                'items'         => []
            ];
        }
        if (!empty(trim($row[3]??''))) {
            $bills[$billNo]['items'][] = [
                'product'  => trim($row[3]),
                'qty'      => intval($row[5]??1),
                'discount' => floatval($row[6]??0),
            ];
        }
    }
    fclose($fh);
    return array_values($bills);
}

function parseXLSX($path) {
    $bills = [];
    try {
        $zip = new ZipArchive();
        if ($zip->open($path)!==true) return $bills;

        $strings = [];
        $ssXml = $zip->getFromName('xl/sharedStrings.xml');
        if ($ssXml) {
            $xml = simplexml_load_string($ssXml);
            foreach ($xml->si as $si) {
                $t = '';
                if (isset($si->t)) { $t=(string)$si->t; }
                else { foreach ($si->r as $r) { if(isset($r->t)) $t.=(string)$r->t; } }
                $strings[]=$t;
            }
        }

        $sheetXml = $zip->getFromName('xl/worksheets/sheet1.xml');
        $zip->close();
        if (!$sheetXml) return $bills;

        $xml = simplexml_load_string($sheetXml);

        foreach ($xml->sheetData->row as $row) {
            $rowNum = (int)$row['r'];
            if ($rowNum < 4) continue; // skip title(1), instructions(2), header(3)

            $cells = [];
            foreach ($row->c as $cell) {
                $ref = (string)$cell['r'];
                preg_match('/([A-Z]+)(\d+)/',$ref,$m);
                $colIdx = colLetterToIndex($m[1]??'A');
                $type   = (string)$cell['t'];
                $val    = (string)$cell->v;
                if ($type==='s') $val = $strings[(int)$val] ?? '';
                elseif ($type==='inlineStr') $val = (string)($cell->is->t ?? '');
                $cells[$colIdx] = trim($val);
            }

            if (empty($cells[0])) continue;

            $billNo = $cells[0];
            if (!isset($bills[$billNo])) {
                $bills[$billNo] = [
                    'bill_no'       => $billNo,
                    'customer_name' => $cells[1] ?? 'Walk-in',
                    'phone'         => $cells[2] ?? '',
                    'payment'       => $cells[3] ?? 'Cash',
                    'items'         => []
                ];
            }

            // Col 4 onwards: product, qty, discount in groups of 3 (up to 10 products)
            for ($col = 4; $col < 34; $col += 3) {
                $prodName = $cells[$col] ?? '';
                if (empty($prodName)) continue;
                $qty = intval($cells[$col+1] ?? 1);
                if ($qty <= 0) $qty = 1;
                $bills[$billNo]['items'][] = [
                    'product'  => $prodName,
                    'qty'      => $qty,
                    'discount' => floatval($cells[$col+2] ?? 0),
                ];
            }
        }
    } catch (Exception $e) {
        // silent
    }
    return array_values($bills);
}

function colLetterToIndex($letters) {
    $letters = strtoupper($letters);
    $idx = 0;
    for ($i=0; $i<strlen($letters); $i++) {
        $idx = $idx*26 + (ord($letters[$i]) - ord('A') + 1);
    }
    return $idx - 1;
}
?>