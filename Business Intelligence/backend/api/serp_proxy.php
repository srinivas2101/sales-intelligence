<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") { http_response_code(200); exit(0); }

$SERPAPI_KEY = "833fd4106eedb13623eea3f8ffbef6db802db013c6ac6f6df7eefada724463a7";

$body = json_decode(file_get_contents("php://input"), true);
$name = trim($body['name'] ?? '');

if (!$name) {
    echo json_encode(["error" => "name required"]);
    exit;
}

$query = urlencode($name . " price india");
$url   = "https://serpapi.com/search.json?engine=google_shopping&q={$query}&gl=in&hl=en&api_key={$SERPAPI_KEY}";

$ctx = stream_context_create([
    'http' => [
        'timeout'        => 12,
        'ignore_errors'  => true,
    ]
]);

$raw  = @file_get_contents($url, false, $ctx);
if ($raw === false) {
    echo json_encode(["error" => "Could not reach SerpAPI"]);
    exit;
}

$data    = json_decode($raw, true);
$items   = $data['shopping_results'] ?? [];
$results = [];

foreach (array_slice($items, 0, 6) as $item) {
    $priceRaw = preg_replace('/[^0-9.]/', '', $item['price'] ?? '');
    $price    = floatval($priceRaw);
    if ($price > 0) {
        $results[] = [
            "source" => $item['source'] ?? $item['seller'] ?? 'Online',
            "price"  => $price,
            "title"  => mb_substr($item['title'] ?? $name, 0, 55),
            "link"   => $item['link'] ?? '',
        ];
    }
}

echo json_encode(["results" => $results, "cached" => false]);