const API_URL = "http://localhost:3000";
let billItems = [];
let totalAmount = 0;

// Load products in dropdown
function loadProducts() {
    fetch(`${API_URL}/products`)
        .then(res => res.json())
        .then(products => {
            const select = document.getElementById("productSelect");
            select.innerHTML = "";
            products.forEach(p => {
                select.innerHTML += `<option value="${p.product_id}" data-price="${p.price}">${p.name}</option>`;
            });
        });
}

// Add product to bill
function addItem() {
    const select = document.getElementById("productSelect");
    const quantity = parseInt(document.getElementById("quantity").value);

    if (!quantity || quantity <= 0) {
        alert("Enter a valid quantity");
        return;
    }

    const product_id = select.value;
    const product_name = select.options[select.selectedIndex].text;
    const price = parseFloat(select.options[select.selectedIndex].dataset.price);

    const item_total = price * quantity;
    totalAmount += item_total;

    billItems.push({ product_id, quantity, item_total });

    updateTable();
}

// Update table on UI
function updateTable() {
    const tbody = document.querySelector("#billTable tbody");
    tbody.innerHTML = "";

    billItems.forEach(item => {
        const row = `
        <tr>
            <td>${item.product_id}</td>
            <td>${item.quantity}</td>
            <td>${item.item_total}</td>
        </tr>`;
        tbody.innerHTML += row;
    });

    document.getElementById("totalAmount").innerText = totalAmount;
}

// Submit bill to backend
function generateBill() {
    const customer_id = document.getElementById("customer_id").value;

    if (!customer_id) {
        alert("Enter customer ID!");
        return;
    }

    if (billItems.length === 0) {
        alert("Add at least one item!");
        return;
    }

    fetch(`${API_URL}/bills`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id, items: billItems })
    })
    .then(res => res.json())
    .then(data => {
        alert(`Bill generated successfully!`);  
        window.location.href = `bill.html?bill_id=${data.bill_id}`;
    });
}

loadProducts();
