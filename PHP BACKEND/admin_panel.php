<?php
// admin_panel.php - Административная панель для управления платежами и возвратами

require_once 'config.php';
require_once 'utils.php';

// Проверка административного доступа
session_start();

if (!isset($_SESSION['admin_authenticated']) || $_SESSION['admin_authenticated'] !== true) {
    if ($_POST['admin_password'] ?? '' === ADMIN_PANEL_PASSWORD) {
        $_SESSION['admin_authenticated'] = true;
    } else {
        showLoginForm();
        exit;
    }
}

// Получение данных для панели
$purchases = getAllPurchases();
$stats = getPurchaseStatistics();

function showLoginForm() {
    ?>
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Admin Panel - Telegram Stars Management</title>
        <!-- Google Font -->
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
            /* ---------- THEME VARIABLES ---------- */
            :root {
                --bg-body: #0e0e0e;
                --bg-surface: #1b1b1b;
                --bg-elevated: #242424;
                --clr-primary: #00bfa6;
                --clr-secondary: #0088cc;
                --clr-error: #e74c3c;
                --clr-warning: #f39c12;
                --clr-success: #27ae60;
                --text-primary: #ffffff;
                --text-secondary: #b5b5b5;
                --border: #333333;
                --shadow-sm: 0 4px 20px rgba(0,0,0,.35);
                --radius-lg: 14px;
            }

            /* ---------- GLOBAL RESETS ---------- */
            *, *::before, *::after { box-sizing: border-box; }
            body {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
                background: var(--bg-body);
                color: var(--text-primary);
                margin: 0;
                padding: 20px;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            /* ---------- LOGIN CARD ---------- */
            .login-container {
                background: var(--bg-elevated);
                padding: 48px 40px;
                border-radius: var(--radius-lg);
                box-shadow: var(--shadow-sm);
                width: 100%;
                max-width: 420px;
                position: relative;
                isolation: isolate;
            }
            .login-container::before {
                content: "";
                position: absolute;
                inset: 0;
                border-radius: inherit;
                background: linear-gradient(135deg, rgba(0,191,166,0.35), rgba(0,136,204,0.35));
                opacity: 0;
                transition: opacity .4s ease;
                z-index: -1;
            }
            .login-container:hover::before {
                opacity: 1;
            }
            h1 {
                text-align: center;
                margin-bottom: 32px;
                font-weight: 600;
            }

            .form-group { margin-bottom: 24px; }
            label {
                display: block;
                margin-bottom: 10px;
                font-weight: 500;
                color: var(--text-secondary);
                font-size: 0.95rem;
            }
            input[type="password"] {
                width: 100%;
                padding: 14px 16px;
                border: 2px solid var(--border);
                border-radius: 8px;
                background: var(--bg-surface);
                color: var(--text-primary);
                font-size: 1rem;
                transition: border-color .3s;
            }
            input[type="password"]:focus {
                outline: none;
                border-color: var(--clr-secondary);
            }

            .btn {
                display: inline-block;
                width: 100%;
                padding: 14px;
                font-size: 1rem;
                font-weight: 600;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                background: linear-gradient(135deg, var(--clr-primary), var(--clr-secondary));
                color: #fff;
                transition: transform .25s cubic-bezier(.4,0,.2,1), box-shadow .25s;
            }
            .btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 24px rgba(0,0,0,.4);
            }
        </style>
    </head>
    <body>
        <div class="login-container">
            <h1>🔐 Admin Access</h1>
            <form method="POST">
                <div class="form-group">
                    <label for="admin_password">Administrative Password:</label>
                    <input type="password" id="admin_password" name="admin_password" required>
                </div>
                <button type="submit" class="btn">Access Admin Panel</button>
            </form>
        </div>
    </body>
    </html>
    <?php
}

function getAllPurchases() {
    $response = supabaseRequest("purchases?select=*,users!inner(first_name,username)&order=created_at.desc");
    if (!$response['success']) {
        logMessage("Failed to get purchases for admin panel", 'ERROR');
        return [];
    }
    return $response['data'] ?? [];
}

function getPurchaseStatistics() {
    $response = supabaseRequest("purchases?select=*");
    if (!$response['success']) {
        return [
            'total_purchases' => 0,
            'total_stars' => 0,
            'completed_purchases' => 0,
            'refunded_purchases' => 0,
            'refunded_stars' => 0
        ];
    }
    $purchases = $response['data'] ?? [];

    $stats = [
        'total_purchases' => count($purchases),
        'total_stars' => 0,
        'completed_purchases' => 0,
        'refunded_purchases' => 0,
        'refunded_stars' => 0
    ];
    foreach ($purchases as $purchase) {
        $stats['total_stars'] += $purchase['amount_stars'];
        if ($purchase['status'] === 'completed') {
            $stats['completed_purchases']++;
        } elseif ($purchase['status'] === 'refunded') {
            $stats['refunded_purchases']++;
            $stats['refunded_stars'] += $purchase['amount_stars'];
        }
    }
    return $stats;
}

function formatDate($dateString) { return date('M j, Y H:i', strtotime($dateString)); }

function getStatusBadge($status) {
    switch ($status) {
        case 'completed': return '<span class="badge badge-success">✓ Completed</span>';
        case 'refunded':  return '<span class="badge badge-warning">↩ Refunded</span>';
        case 'failed':    return '<span class="badge badge-error">✗ Failed</span>';
        case 'pending':   return '<span class="badge badge-pending">⏳ Pending</span>';
        default:          return '<span class="badge badge-unknown">' . htmlspecialchars($status) . '</span>';
    }
}

function canRefund($purchase) {
    if ($purchase['status'] !== 'completed') return false;
    $purchaseDate = new DateTime($purchase['created_at']);
    $daysDifference = (new DateTime())->diff($purchaseDate)->days;
    return $daysDifference <= 180;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Telegram Stars Admin Panel</title>
    <!-- Google Font -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        /* ---------- THEME VARIABLES ---------- */
        :root {
            --bg-body: #0e0e0e;
            --bg-surface: #1b1b1b;
            --bg-elevated: #242424;
            --clr-primary: #00bfa6;
            --clr-secondary: #0088cc;
            --clr-error: #e74c3c;
            --clr-warning: #f39c12;
            --clr-success: #27ae60;
            --text-primary: #ffffff;
            --text-secondary: #b5b5b5;
            --border: #333333;
            --shadow-sm: 0 4px 12px rgba(0,0,0,.35);
            --shadow-md: 0 6px 24px rgba(0,0,0,.35);
            --radius-lg: 14px;
            --radius-md: 10px;
        }

        /* ---------- GLOBAL STYLES ---------- */
        *, *::before, *::after { box-sizing: border-box; }
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            background: var(--bg-body);
            color: var(--text-primary);
            margin: 0;
            padding: 20px;
            line-height: 1.6;
        }
        a { color: var(--clr-secondary); text-decoration: none; }

        /* ---------- HEADER ---------- */
        .header {
            background: linear-gradient(135deg, rgba(0,191,166,0.2), rgba(0,136,204,0.2));
            padding: 24px;
            border-radius: var(--radius-lg);
            margin-bottom: 32px;
            box-shadow: var(--shadow-sm);
        }
        .header h1 {
            margin: 0 0 8px 0;
            font-size: 1.6rem;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .logout-btn {
            background: var(--bg-elevated);
            color: var(--text-secondary);
            padding: 10px 18px;
            border-radius: var(--radius-md);
            font-size: 0.9rem;
            transition: background .25s, transform .25s;
        }
        .logout-btn:hover {
            background: var(--bg-surface);
            transform: translateY(-2px);
        }

        /* ---------- SEARCH & ACTIONS ---------- */
        .admin-actions {
            display: grid;
            grid-template-columns: 1fr auto auto;
            gap: 20px;
            margin-bottom: 32px;
            align-items: end;
        }
        
        .search-container {
            position: relative;
        }
        
        .search-input {
            width: 100%;
            padding: 12px 16px 12px 44px;
            border: 2px solid var(--border);
            border-radius: var(--radius-md);
            background: var(--bg-elevated);
            color: var(--text-primary);
            font-size: 0.95rem;
            transition: border-color .3s;
        }
        
        .search-input:focus {
            outline: none;
            border-color: var(--clr-secondary);
        }
        
        .search-icon {
            position: absolute;
            left: 14px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--text-secondary);
            font-size: 1.1rem;
        }
        
        .clear-search {
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            color: var(--text-secondary);
            cursor: pointer;
            font-size: 1.1rem;
            padding: 4px;
            border-radius: 4px;
            transition: background .25s;
        }
        
        .clear-search:hover {
            background: var(--bg-surface);
            color: var(--text-primary);
        }

        .manual-refund-btn {
            background: var(--clr-error);
            color: #fff;
            padding: 12px 20px;
            border: none;
            border-radius: var(--radius-md);
            font-size: 0.9rem;
            font-weight: 600;
            cursor: pointer;
            transition: transform .25s, box-shadow .25s;
            white-space: nowrap;
        }
        
        .manual-refund-btn:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-sm);
        }

        /* ---------- STATS GRID ---------- */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 24px;
            margin-bottom: 40px;
        }
        .stat-card {
            position: relative;
            background: var(--bg-elevated);
            border: 2px solid var(--border);
            padding: 32px 24px;
            border-radius: var(--radius-lg);
            text-align: center;
            transition: transform .25s, border-color .25s, box-shadow .25s;
            isolation: isolate;
        }
        .stat-card::before {
            content: "";
            position: absolute;
            inset: 0;
            border-radius: inherit;
            background: linear-gradient(145deg, rgba(0,191,166,0.25), rgba(0,136,204,0.25));
            opacity: 0;
            transition: opacity .4s;
            z-index: -1;
        }
        .stat-card:hover {
            transform: translateY(-4px);
            border-color: var(--clr-secondary);
            box-shadow: var(--shadow-md);
        }
        .stat-card:hover::before { opacity: 1; }
        .stat-number { font-size: 2.1rem; font-weight: 700; color: var(--clr-secondary); }
        .stat-label { color: var(--text-secondary); font-size: 0.9rem; margin-top: 6px; }

        /* ---------- TABLE ---------- */
        .purchases-table {
            background: var(--bg-elevated);
            border-radius: var(--radius-lg);
            overflow: hidden;
            box-shadow: var(--shadow-sm);
        }
        .table-header {
            background: var(--bg-surface);
            padding: 22px 24px;
            border-bottom: 2px solid var(--border);
        }
        .table-header h2 { margin: 0; font-size: 1.25rem; font-weight: 600; display: flex; align-items: center; gap: 10px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 14px 18px; text-align: left; border-bottom: 1px solid var(--border); }
        th {
            background: var(--bg-surface);
            font-weight: 600;
            color: var(--text-primary);
            position: sticky;
            top: 0;
            z-index: 10;
        }
        tbody tr:hover { background: var(--bg-surface); }
        tbody tr.hidden { display: none; }
        .user-info { display: flex; flex-direction: column; gap: 2px; }
        .user-name { font-weight: 600; }
        .user-details { font-size: 0.8rem; color: var(--text-secondary); }
        .amount { font-weight: 600; color: var(--clr-warning); }
        .transaction-id {
            font-family: monospace;
            font-size: 0.8rem;
            color: var(--text-secondary);
            word-break: break-all;
        }

        /* ---------- NO RESULTS ---------- */
        .no-results {
            display: none;
            text-align: center;
            padding: 40px;
            color: var(--text-secondary);
            font-style: italic;
        }

        /* ---------- BADGES ---------- */
        .badge {
            padding: 6px 10px;
            border-radius: 9999px;
            font-size: 0.78rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: .5px;
        }
        .badge-success  { background: var(--clr-success);  color: #fff; }
        .badge-warning  { background: var(--clr-warning); color: #fff; }
        .badge-error    { background: var(--clr-error);   color: #fff; }
        .badge-pending  { background: var(--clr-secondary); color: #fff; }
        .badge-unknown  { background: #555555; color: #fff; }

        /* ---------- BUTTONS ---------- */
        .btn {
            padding: 10px 18px;
            font-size: 0.9rem;
            border: none;
            border-radius: var(--radius-md);
            cursor: pointer;
            transition: transform .25s, box-shadow .25s;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }
        .btn-refund {
            background: var(--clr-error);
            color: #fff;
        }
        .btn-refund:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: var(--shadow-sm);
            background: #c0392b;
        }
        .btn-refund:disabled { background: #555; cursor: not-allowed; transform: none; }

        /* ---------- MODAL ---------- */
        .modal {
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.75);
            z-index: 1000;
            align-items: center;
            justify-content: center;
        }
        .modal-content {
            background: var(--bg-elevated);
            padding: 36px 28px;
            border-radius: var(--radius-lg);
            width: 90%;
            max-width: 520px;
            box-shadow: var(--shadow-md);
            animation: fadeInScale .35s ease forwards;
        }
        @keyframes fadeInScale {
            from { opacity: 0; transform: scale(0.9); }
            to   { opacity: 1; transform: scale(1); }
        }
        .modal h3 { margin-top: 0; color: var(--clr-error); }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; margin-bottom: 8px; font-weight: 500; color: var(--text-secondary); }
        .form-group input, .form-group textarea {
            width: 100%;
            padding: 12px;
            border: 2px solid var(--border);
            border-radius: var(--radius-md);
            background: var(--bg-surface);
            color: var(--text-primary);
        }
        .btn-group { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; }
        .btn-secondary {
            background: #555;
            color: #fff;
        }
        .btn-secondary:hover {
            transform: translateY(-2px);
        }

        /* ---------- CUSTOM SCROLLBAR ---------- */
        ::-webkit-scrollbar { width: 10px; height: 10px; }
        ::-webkit-scrollbar-track { background: var(--bg-surface); }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--clr-secondary); }

        /* ---------- RESPONSIVE ---------- */
        @media (max-width: 640px) {
            .stat-card { padding: 24px 18px; }
            th, td { padding: 12px 14px; }
            .header { padding: 18px; }
            .admin-actions {
                grid-template-columns: 1fr;
                gap: 16px;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 24px;">
            <h1>⭐ Telegram Stars Admin Panel</h1>
            <a href="?logout=1" class="logout-btn">Logout</a>
        </div>
        <p style="margin: 0; color: var(--text-secondary);">Manage payments and process refunds for Telegram Stars transactions</p>
    </div>

    <!-- Search and Actions -->
    <div class="admin-actions">
        <div class="search-container">
            <div class="search-icon">🔍</div>
            <input 
                type="text" 
                id="searchInput" 
                class="search-input" 
                placeholder="Search by Transaction ID, User Name, or Telegram ID..."
                autocomplete="off"
            >
            <button class="clear-search" id="clearSearch" style="display: none;">✕</button>
        </div>
        
        <button class="manual-refund-btn" onclick="openManualRefundModal()">
            🔄 Manual Refund
        </button>
        
        <div style="color: var(--text-secondary); font-size: 0.85rem; text-align: right;">
            <div id="searchResults">Total: <?php echo count($purchases); ?> transactions</div>
        </div>
    </div>

    <div class="stats-grid">
        <div class="stat-card">
            <span class="stat-number"><?php echo $stats['total_purchases']; ?></span>
            <div class="stat-label">Total Purchases</div>
        </div>
        <div class="stat-card">
            <span class="stat-number"><?php echo $stats['total_stars']; ?> ⭐</span>
            <div class="stat-label">Total Stars Collected</div>
        </div>
        <div class="stat-card">
            <span class="stat-number"><?php echo $stats['completed_purchases']; ?></span>
            <div class="stat-label">Completed</div>
        </div>
        <div class="stat-card">
            <span class="stat-number"><?php echo $stats['refunded_purchases']; ?></span>
            <div class="stat-label">Refunded</div>
        </div>
        <div class="stat-card">
            <span class="stat-number"><?php echo $stats['refunded_stars']; ?> ⭐</span>
            <div class="stat-label">Stars Refunded</div>
        </div>
    </div>

    <div class="purchases-table">
        <div class="table-header"><h2>📋 All Transactions</h2></div>
        <div style="overflow-x: auto;">
            <table>
                <thead>
                    <tr>
                        <th>User</th>
                        <th>Product</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Transaction ID</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="transactionsTableBody">
                    <?php if (empty($purchases)): ?>
                    <tr>
                        <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-secondary);">No transactions found</td>
                    </tr>
                    <?php else: ?>
                        <?php foreach ($purchases as $purchase): ?>
                        <tr class="transaction-row" data-transaction-id="<?php echo htmlspecialchars($purchase['transaction_id']); ?>" data-user-name="<?php echo htmlspecialchars($purchase['users']['first_name'] ?? 'Unknown'); ?>" data-telegram-id="<?php echo $purchase['telegram_id']; ?>">
                            <td>
                                <div class="user-info">
                                    <div class="user-name"><?php echo htmlspecialchars($purchase['users']['first_name'] ?? 'Unknown'); ?></div>
                                    <div class="user-details">
                                        ID: <?php echo $purchase['telegram_id']; ?>
                                        <?php if (!empty($purchase['users']['username'])): ?> | @<?php echo htmlspecialchars($purchase['users']['username']); ?> <?php endif; ?>
                                    </div>
                                </div>
                            </td>
                            <td><?php echo htmlspecialchars($purchase['product_type']); ?></td>
                            <td><span class="amount"><?php echo $purchase['amount_stars']; ?> ⭐</span></td>
                            <td><?php echo getStatusBadge($purchase['status']); ?></td>
                            <td><?php echo formatDate($purchase['created_at']); ?></td>
                            <td><div class="transaction-id"><?php echo htmlspecialchars($purchase['transaction_id']); ?></div></td>
                            <td>
                                <?php if (canRefund($purchase)): ?>
                                    <button class="btn btn-refund" onclick="openRefundModal('<?php echo htmlspecialchars($purchase['transaction_id']); ?>', '<?php echo htmlspecialchars($purchase['users']['first_name'] ?? 'Unknown'); ?>', <?php echo $purchase['amount_stars']; ?>)">Refund</button>
                                <?php else: ?>
                                    <span style="color: var(--text-secondary); font-size: 0.8rem;">
                                        <?php echo $purchase['status'] === 'refunded' ? 'Already refunded' : 'Cannot refund'; ?>
                                    </span>
                                <?php endif; ?>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
            <div class="no-results" id="noResults">
                <p>No transactions found matching your search.</p>
            </div>
        </div>
    </div>

    <!-- Standard Refund Modal -->
    <div id="refundModal" class="modal">
        <div class="modal-content">
            <h3>🔄 Process Refund</h3>
            <form id="refundForm">
                <div class="form-group">
                    <label>Transaction ID:</label>
                    <input type="text" id="refundTransactionId" readonly>
                </div>
                <div class="form-group">
                    <label>User:</label>
                    <input type="text" id="refundUserName" readonly>
                </div>
                <div class="form-group">
                    <label>Amount:</label>
                    <input type="text" id="refundAmount" readonly>
                </div>
                <div class="form-group">
                    <label>Refund Reason:</label>
                    <textarea id="refundReason" rows="3" placeholder="Enter reason for refund..." required></textarea>
                </div>
                <div class="btn-group">
                    <button type="button" class="btn btn-secondary" onclick="closeRefundModal()">Cancel</button>
                    <button type="submit" class="btn btn-refund">Process Refund</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Manual Refund Modal -->
    <div id="manualRefundModal" class="modal">
        <div class="modal-content">
            <h3>🔄 Manual Refund by Transaction ID</h3>
            <form id="manualRefundForm">
                <div class="form-group">
                    <label>Telegram ID:</label>
                    <input type="text" id="manualRefundTelegramId" placeholder="Enter Telegram ID..." required>
                </div>
                <div class="form-group">
                    <label>Transaction ID:</label>
                    <input type="text" id="manualRefundTransactionId" placeholder="Enter transaction ID..." required>
                </div>
                <div class="form-group">
                    <label>Refund Reason:</label>
                    <textarea id="manualRefundReason" rows="3" placeholder="Enter reason for refund..." required></textarea>
                </div>
                <div class="btn-group">
                    <button type="button" class="btn btn-secondary" onclick="closeManualRefundModal()">Cancel</button>
                    <button type="submit" class="btn btn-refund">Process Manual Refund</button>
                </div>
            </form>
        </div>
    </div>

    <script>
        // Search functionality
        const searchInput = document.getElementById('searchInput');
        const clearSearch = document.getElementById('clearSearch');
        const searchResults = document.getElementById('searchResults');
        const noResults = document.getElementById('noResults');
        const transactionRows = document.querySelectorAll('.transaction-row');
        const totalTransactions = transactionRows.length;

        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase().trim();
            
            if (searchTerm === '') {
                clearSearch.style.display = 'none';
                showAllRows();
                return;
            }
            
            clearSearch.style.display = 'block';
            filterTransactions(searchTerm);
        });

        clearSearch.addEventListener('click', function() {
            searchInput.value = '';
            this.style.display = 'none';
            showAllRows();
        });

        function filterTransactions(searchTerm) {
            let visibleCount = 0;
            
            transactionRows.forEach(row => {
                const transactionId = row.dataset.transactionId.toLowerCase();
                const userName = row.dataset.userName.toLowerCase();
                const telegramId = row.dataset.telegramId.toLowerCase();
                
                const isMatch = transactionId.includes(searchTerm) || 
                               userName.includes(searchTerm) || 
                               telegramId.includes(searchTerm);
                
                if (isMatch) {
                    row.classList.remove('hidden');
                    visibleCount++;
                } else {
                    row.classList.add('hidden');
                }
            });
            
            updateSearchResults(visibleCount, searchTerm);
        }

        function showAllRows() {
            transactionRows.forEach(row => {
                row.classList.remove('hidden');
            });
            noResults.style.display = 'none';
            searchResults.textContent = `Total: ${totalTransactions} transactions`;
        }

        function updateSearchResults(count, searchTerm) {
            if (count === 0) {
                noResults.style.display = 'block';
                searchResults.textContent = `No results for "${searchTerm}"`;
            } else {
                noResults.style.display = 'none';
                searchResults.textContent = `Found: ${count} transaction${count !== 1 ? 's' : ''} for "${searchTerm}"`;
            }
        }

        // Standard refund modal functions
        function openRefundModal(transactionId, userName, amount) {
            document.getElementById('refundTransactionId').value = transactionId;
            document.getElementById('refundUserName').value = userName;
            document.getElementById('refundAmount').value = amount + ' ⭐';
            document.getElementById('refundReason').value = '';
            document.getElementById('refundModal').style.display = 'flex';
        }
        
        function closeRefundModal() { 
            document.getElementById('refundModal').style.display = 'none'; 
        }

        // Standard refund form handler
        document.getElementById('refundForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const transactionId = document.getElementById('refundTransactionId').value;
            const reason = document.getElementById('refundReason').value;
            await processRefund(transactionId, reason);
            closeRefundModal();
        });

        // Manual refund modal functions
        function openManualRefundModal() {
            document.getElementById('manualRefundTelegramId').value = '';
            document.getElementById('manualRefundTransactionId').value = '';
            document.getElementById('manualRefundReason').value = '';
            document.getElementById('manualRefundModal').style.display = 'flex';
        }
        
        function closeManualRefundModal() { 
            document.getElementById('manualRefundModal').style.display = 'none'; 
        }

        // Manual refund form handler
        document.getElementById('manualRefundForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const telegramId = document.getElementById('manualRefundTelegramId').value.trim();
            const transactionId = document.getElementById('manualRefundTransactionId').value.trim();
            const reason = document.getElementById('manualRefundReason').value;
            
            if (!telegramId) {
                alert('Please enter a Telegram ID');
                return;
            }
            
            if (!transactionId) {
                alert('Please enter a transaction ID');
                return;
            }
            
            if (!reason.trim()) {
                alert('Please enter a reason for the refund');
                return;
            }
            
            if (!confirm(`Are you sure you want to process a manual refund for transaction ID: ${transactionId}?\n\nThis action cannot be undone.`)) {
                return;
            }
            
            await processManualRefund(telegramId, transactionId, reason);
            closeManualRefundModal();
        });

        // Common refund processing function
        async function processRefund(transactionId, reason) {
            if (!reason.trim()) { 
                alert('Please enter a reason for the refund'); 
                return; 
            }
            
            try {
                const response = await fetch('refund_handler.php', {
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        transaction_id: transactionId, 
                        reason: reason, 
                        admin_key: '<?php echo ADMIN_REFUND_KEY; ?>' 
                    })
                });
                
                const result = await response.json();
                
                if (result.success) { 
                    alert('Refund processed successfully'); 
                    location.reload(); 
                } else { 
                    alert('Refund failed: ' + result.error); 
                }
            } catch (error) { 
                alert('Error processing refund: ' + error.message); 
            }
        }

        // Manual refund processing function
        async function processManualRefund(telegramId, transactionId, reason) {
            try {
                const response = await fetch('refund_handler.php', {
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        transaction_id: transactionId,
                        telegram_id: telegramId,
                        reason: reason, 
                        admin_key: '<?php echo ADMIN_REFUND_KEY; ?>',
                        is_manual: true
                    })
                });
                
                const result = await response.json();
                
                if (result.success) { 
                    alert('Manual refund processed successfully'); 
                    location.reload(); 
                } else { 
                    alert('Manual refund failed: ' + result.error); 
                }
            } catch (error) { 
                alert('Error processing manual refund: ' + error.message); 
            }
        }

        // Click outside modal to close
        document.getElementById('refundModal').addEventListener('click', function(e) { 
            if (e.target === this) { closeRefundModal(); } 
        });
        
        document.getElementById('manualRefundModal').addEventListener('click', function(e) { 
            if (e.target === this) { closeManualRefundModal(); } 
        });
    </script>
</body>
</html>
<?php
// Обработка выхода
if (isset($_GET['logout'])) {
    session_destroy();
    header('Location: admin_panel.php');
    exit;
}
?>