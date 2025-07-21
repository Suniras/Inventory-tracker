let inventory = JSON.parse(localStorage.getItem('inventory') || '[]');
let currentSort = { field: 'name', direction: 'asc' };
let editingId = null;

// Save to localStorage
function saveToStorage() {
    localStorage.setItem('inventory', JSON.stringify(inventory));
}

// Generate unique ID
function generateId() {
    return Date.now() + Math.random().toString(36).substr(2, 9);
}

// Update statistics
function updateStats() {
    const totalItems = inventory.length;
    const lowStock = inventory.filter(item => item.quantity <= item.lowStockAlert && item.quantity > 0).length;
    const outOfStock = inventory.filter(item => item.quantity === 0).length;
    const totalValue = inventory.reduce((sum, item) => sum + (item.quantity * (item.price || 0)), 0);

    document.getElementById('totalItems').textContent = totalItems;
    document.getElementById('lowStock').textContent = lowStock;
    document.getElementById('outOfStock').textContent = outOfStock;
    document.getElementById('totalValue').textContent = `$${totalValue.toFixed(2)}`;
}

// Get stock status
function getStockStatus(item) {
    if (item.quantity === 0) return { class: 'stock-out', text: 'Out of Stock' };
    if (item.quantity <= item.lowStockAlert) return { class: 'stock-low', text: 'Low Stock' };
    if (item.quantity <= item.lowStockAlert * 2) return { class: 'stock-medium', text: 'Medium Stock' };
    return { class: 'stock-high', text: 'In Stock' };
}

// Filter products
function getFilteredProducts() {
    let filtered = [...inventory];

    // Apply search filter
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    if (searchTerm) {
        filtered = filtered.filter(item =>
            item.name.toLowerCase().includes(searchTerm) ||
            item.category.toLowerCase().includes(searchTerm)
        );
    }

    // Apply status filter
    const statusFilter = document.getElementById('filterSelect').value;
    switch (statusFilter) {
        case 'low':
            filtered = filtered.filter(item => item.quantity <= item.lowStockAlert && item.quantity > 0);
            break;
        case 'out':
            filtered = filtered.filter(item => item.quantity === 0);
            break;
        case 'high':
            filtered = filtered.filter(item => item.quantity > item.lowStockAlert);
            break;
    }

    return filtered;
}

// Sort table
function sortTable(field) {
    if (currentSort.field === field) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.field = field;
        currentSort.direction = 'asc';
    }

    renderInventory();
    updateSortIndicators();
}

// Update sort indicators
function updateSortIndicators() {
    document.querySelectorAll('.sort-indicator').forEach(indicator => {
        indicator.textContent = '↕';
    });

    const activeHeader = document.querySelector(`th[onclick="sortTable('${currentSort.field}')"] .sort-indicator`);
    if (activeHeader) {
        activeHeader.textContent = currentSort.direction === 'asc' ? '↑' : '↓';
    }
}

// Render inventory table
function renderInventory() {
    const filtered = getFilteredProducts();

    // Sort products
    filtered.sort((a, b) => {
        let valueA = a[currentSort.field];
        let valueB = b[currentSort.field];

        if (typeof valueA === 'string') {
            valueA = valueA.toLowerCase();
            valueB = valueB.toLowerCase();
        }

        if (currentSort.direction === 'asc') {
            return valueA > valueB ? 1 : -1;
        } else {
            return valueA < valueB ? 1 : -1;
        }
    });

    const tbody = document.getElementById('inventoryBody');
    const emptyState = document.getElementById('emptyState');
    const table = document.getElementById('inventoryTable');

    if (filtered.length === 0) {
        table.style.display = 'none';
        emptyState.style.display = 'block';
        if (inventory.length === 0) {
            emptyState.querySelector('h3').textContent = 'No products in inventory';
            emptyState.querySelector('p').textContent = 'Click "Add Product" to get started';
        } else {
            emptyState.querySelector('h3').textContent = 'No products match your search';
            emptyState.querySelector('p').textContent = 'Try adjusting your filters';
        }
        return;
    }

    table.style.display = 'table';
    emptyState.style.display = 'none';

    tbody.innerHTML = filtered.map(item => {
        const status = getStockStatus(item);
        return `
                    <tr>
                        <td class="product-name">${item.name}</td>
                        <td>${item.category}</td>
                        <td>
                            <div class="quantity-controls">
                                <button class="quantity-btn decrease-btn" onclick="updateQuantity('${item.id}', -1)">−</button>
                                <strong>${item.quantity}</strong>
                                <button class="quantity-btn increase-btn" onclick="updateQuantity('${item.id}', 1)">+</button>
                            </div>
                        </td>
                        <td>$${(item.price || 0).toFixed(2)}</td>
                        <td><span class="stock-badge ${status.class}">${status.text}</span></td>
                        <td>
                            <button class="delete-btn" onclick="deleteProduct('${item.id}')">Delete</button>
                        </td>
                    </tr>
                `;
    }).join('');

    updateSortIndicators();
}

// Open add product modal
function openAddModal() {
    editingId = null;
    document.getElementById('modalTitle').textContent = 'Add New Product';
    document.getElementById('productForm').reset();
    document.getElementById('productModal').style.display = 'block';
}

// Close modal
function closeModal() {
    document.getElementById('productModal').style.display = 'none';
    editingId = null;
}

// Save product
function saveProduct() {
    const name = document.getElementById('productName').value.trim();
    const category = document.getElementById('productCategory').value;
    const quantity = parseInt(document.getElementById('productQuantity').value) || 0;
    const price = parseFloat(document.getElementById('productPrice').value) || 0;
    const lowStockAlert = parseInt(document.getElementById('lowStockAlert').value) || 10;

    if (!name) {
        alert('Product name is required');
        return;
    }

    const product = {
        id: editingId || generateId(),
        name,
        category,
        quantity,
        price,
        lowStockAlert,
        createdAt: editingId ? inventory.find(i => i.id === editingId).createdAt : new Date().toISOString()
    };

    if (editingId) {
        const index = inventory.findIndex(i => i.id === editingId);
        inventory[index] = product;
    } else {
        inventory.push(product);
    }

    saveToStorage();
    renderInventory();
    updateStats();
    closeModal();
}

// Update quantity
function updateQuantity(id, change) {
    const item = inventory.find(i => i.id === id);
    if (item) {
        item.quantity = Math.max(0, item.quantity + change);
        saveToStorage();
        renderInventory();
        updateStats();
    }
}

// Delete product
function deleteProduct(id) {
    if (confirm('Are you sure you want to delete this product?')) {
        inventory = inventory.filter(i => i.id !== id);
        saveToStorage();
        renderInventory();
        updateStats();
    }
}

// Search and filter handlers
document.getElementById('searchInput').addEventListener('input', renderInventory);
document.getElementById('filterSelect').addEventListener('change', renderInventory);

// Close modal when clicking outside
document.getElementById('productModal').addEventListener('click', function (e) {
    if (e.target === this) {
        closeModal();
    }
});

// Sample data for demonstration
function addSampleData() {
    if (inventory.length === 0) {
        inventory = [
            {
                id: generateId(),
                name: "Wireless Headphones",
                category: "Electronics",
                quantity: 25,
                price: 79.99,
                lowStockAlert: 10,
                createdAt: new Date().toISOString()
            },
            {
                id: generateId(),
                name: "Coffee Mug",
                category: "Home & Garden",
                quantity: 8,
                price: 12.50,
                lowStockAlert: 10,
                createdAt: new Date().toISOString()
            },
            {
                id: generateId(),
                name: "Running Shoes",
                category: "Sports & Outdoor",
                quantity: 0,
                price: 120.00,
                lowStockAlert: 5,
                createdAt: new Date().toISOString()
            },
            {
                id: generateId(),
                name: "Programming Book",
                category: "Books & Media",
                quantity: 15,
                price: 45.99,
                lowStockAlert: 8,
                createdAt: new Date().toISOString()
            }
        ];
        saveToStorage();
    }
}

// Initialize app
function init() {
    addSampleData();
    renderInventory();
    updateStats();
}

// Start the app
window.addEventListener('load', init);