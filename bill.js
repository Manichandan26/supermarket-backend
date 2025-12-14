const API_URL = "http://localhost:3000";

// Read bill ID from URL
const urlParams = new URLSearchParams(window.location.search);
const billId = urlParams.get("bill_id");

// Fetch bill details
fetch(`${API_URL}/bills/${billId}`)
    .then(res => res.json())
    .then(data => {
        const bill = data.bill;
        const items = data.items;

        let html = `
            <h3>Bill No: ${bill.bill_id}</h3>
            <p><strong>Date:</strong> ${bill.bill_date}</p>
            <p><strong>Customer:</strong> ${bill.customer_name}</p>

            <h3>Items:</h3>
            <table class="bill-table">
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>Qty</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
        `;

        items.forEach(item => {
            html += `
                <tr>
                    <td>${item.product_name}</td>
                    <td>${item.quantity}</td>
                    <td>₹${item.item_total}</td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
            <h2>Grand Total: ₹${bill.total_amount}</h2>
        `;

        document.getElementById("billDetails").innerHTML = html;
    });
