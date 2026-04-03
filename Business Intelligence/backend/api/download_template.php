<?php
$file = dirname(__DIR__) . '/templates/BI_Daily_Bills_Template.xlsx';
if (!file_exists($file)) {
    http_response_code(404);
    echo "Template not found";
    exit;
}
header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
header('Content-Disposition: attachment; filename="BI_Daily_Bills_Template.xlsx"');
header('Content-Length: ' . filesize($file));
readfile($file);
