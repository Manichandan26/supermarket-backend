const API_URL = "http://localhost:3000";

// Fetch and show products
function loadProducts() {
    fetch(`${API_URL}/products`)
        .then(res => res.json())
        .then(data => {
            const tbody = document.querySelector("#productTable tbody");
            tbody.innerHTML = "";

            data.forEach(p => {
                const row = `
                <tr>
                    <td>${p.name}</td>
                    <td>${p.price}</td>
                    <td>${p.stock}</td>
                    <td>
                        <button onclick="editProduct(${p.product_id}, '${p.name}', ${p.price}, ${p.stock})">Edit</button>
                        <button onclick="deleteProduct(${p.product_id})">Delete</button>
                    </td>
                </tr>`;
                tbody.innerHTML += row;
            });
        });
}

// Save (Add / Update)
function saveProduct() {
    const id = document.getElementById("product_id").value;
    const name = document.getElementById("name").value;
    const price = document.getElementById("price").value;
    const stock = document.getElementById("stock").value;

    const product = { name, price, stock };

    // If id exists → update
    if (id) {
        fetch(`${API_URL}/products/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(product)
        })
        .then(() => {
            resetForm();
            loadProducts();
        });
    } 
    // Add new product
    else {
        fetch(`${API_URL}/products`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(product)
        })
        .then(() => {
            resetForm();
            loadProducts();
        });
    }
}

// Fill form for editing
function editProduct(id, name, price, stock) {
    document.getElementById("product_id").value = id;
    document.getElementById("name").value = name;
    document.getElementById("price").value = price;
    document.getElementById("stock").value = stock;
}

// Delete
function deleteProduct(id) {
    fetch(`${API_URL}/products/${id}`, {
        method: "DELETE"
    })
    .then(() => loadProducts());
}

function resetForm() {
    document.getElementById("product_id").value = "";
    document.getElementById("name").value = "";
    document.getElementById("price").value = "";
    document.getElementById("stock").value = "";
}

// Load on page open
loadProducts();
